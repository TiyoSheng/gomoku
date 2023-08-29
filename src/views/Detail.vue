<script setup>
import { onMounted, ref, onBeforeUnmount, watch, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useGlobalStore } from '../hooks/globalStore'
import { execute } from '../libs/inject'
import firework from '../libs/firework';
import { ethers } from "ethers";

const { store } = useGlobalStore()
const message = useMessage()
const route = useRoute()
const router = useRouter()
const pan = ref(null)
const items = ref(null)
const isOver = ref(false)
const map = ref(new Array(m + 1).fill(0).map(() => new Array(m).fill(0)))
const tempMap = ref(new Array(m + 1).fill(0).map(() => new Array(m).fill(0)))
const loading = ref(false)
const playerType = ref(0)
const blackPlayerInfo = ref({})
const whitePlayerInfo = ref({})
const txList = ref([])
const winner = ref(0)
const turn = ref(0)
// router 获取参数
const roomId = route.params.id
const m = 15;
const cellWidth = 35
const boardWidth = m * cellWidth
const k = 5
let cell = {}
let result = []
let room = {}
let blackPlayer = ''
let whitePlayer = ''
let interval1 = null

const getCanvas = () => {
  firework.onLoad();
}


const getBoard = async () => {
  loading.value = true
  let contract = toRaw(store.state.contract)
  try {
    let board = await contract.getBoard(roomId)
    map.value = JSON.parse(JSON.stringify(board))
    let count = 0
    map.value.forEach(item => {
      item.forEach(i => {
        if (i > 0) {
          count++
        }
      })
    })
    turn.value = count
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)
  }
  loading.value = false
}

const getRoom = async () => {
  let contract = toRaw(store.state.contract)
  const res = await contract.rooms(roomId)
  room = res
  blackPlayer = room.blackPlayer
  whitePlayer = room.whitePlayer
  if (blackPlayer == store.state.aaAddress) {
    playerType.value = 1
  } else if (whitePlayer == store.state.aaAddress) {
    playerType.value = 2
  }
  if (room.gameState == 2) {
    isOver.value = true
    if (room.winner.toLocaleLowerCase() == blackPlayer.toLocaleLowerCase()) {
      winner.value = 1
    } else if (room.winner.toLocaleLowerCase() == whitePlayer.toLocaleLowerCase()) {
      winner.value = 2
    }
  }
  blackPlayerInfo.value = await contract.players(blackPlayer)
  whitePlayerInfo.value = await contract.players(whitePlayer)
  checkBlock(room)
}

const checkBlock = async (room) => {
  interval1 && clearInterval(interval1)
  let contract = toRaw(store.state.contract)
  if (!room) {
    room = await contract.rooms(roomId)
  }
  // get getBlockNumber
  let web3 = new ethers.providers.Web3Provider(window.ethereum);
  interval1 = setInterval(async () => {
    let blockNumber = await web3.getBlockNumber()
    if (blockNumber - Number(room.lastMoveBlock) > 50) {
      interval1 && clearInterval(interval1)
      loading.value = true
      try {
        let tx = await execute(contract, 'checkOverTime', [roomId])
        console.log(tx)
        isOver.value = true
      } catch (error) {
        console.log(error)
        // message.error(error.reason || error.data?.message || error.message)
      }
      loading.value = false
    }
  }, 10000)
}

const toScan = (hash) => {
  window.open(`https://opbnbscan.com/tx/${hash}`)
}

const formatAddress = (address) => {
  if (address) {
    return address.slice(0, 6) + '...' + address.slice(-4)
  }
}

onMounted(() => {
  setBoard()
})

onBeforeUnmount(() => {
  toRaw(store.state.contract).removeAllListeners('MoveMade')
  toRaw(store.state.contract).removeAllListeners('GameEnded')
  interval1 && clearInterval(interval1)
})

const setBoard = () => {
  const elementBoard = pan.value;
  const elementContext = elementBoard.getContext("2d");
  elementBoard.setAttribute("width", boardWidth);
  elementBoard.setAttribute("height", boardWidth);
  elementContext.beginPath();
  elementContext.lineWidth = "1";
  elementContext.strokeStyle = "#6d4c36";

  for (let i = 0; i < m; i++) {
    elementContext.moveTo(cellWidth * i + cellWidth / 2, cellWidth / 2);
    elementContext.lineTo(
      cellWidth * i + cellWidth / 2,
      boardWidth - cellWidth / 2
    );
    elementContext.moveTo(cellWidth / 2, cellWidth * i + cellWidth / 2);
    elementContext.lineTo(
      boardWidth - cellWidth / 2,
      cellWidth * i + cellWidth / 2
    );
  }
  elementContext.stroke();
}

const isItemClicked = (column, row) => {
  if (isOver.value) {
    message.error('Game over')
    return
  };
  // 如果不是当前玩家，不允许点击
  if (playerType.value == 1 && turn.value % 2 != 0) {
    // 英文
    message.error('It is not your turn')
    return
  } else if (playerType.value == 2 && turn.value % 2 == 0) {
    message.error('It is not your turn')
    return
  }
  tempMap.value = new Array(m).fill(0).map(() => new Array(m).fill(0))
  if (map.value[column][row] === 0) {
    console.log(turn.value)
    let player = turn.value % 2 === 0 ? 1 : 2;
    tempMap.value[column][row] = player;

    cell = {
      column: column,
      row: row,
      player: player,
    };
    console.log(cell)
  }
};

const fall = async () => {
  if (isOver.value) return;
  if (!cell.player) {
    message.error('Please select a cell')
    return;
  }
  loading.value = true
  let contract = toRaw(store.state.contract)
  try {
    let tx = await execute(contract, 'makeMove', [roomId, cell.column, cell.row])
    console.log(tx, tx.gasPrice.toString())
    let gasPrice = tx.gasPrice.toString()
    let gasLimit = tx.gasLimit.toString()
    let gas = Number(gasPrice) * Number(gasLimit)
    //to wei
    gas = ethers.utils.formatEther(gas.toString())
    txList.value.push({ player: cell.player, tx: tx, x: cell.column, y: cell.row, gas })
    turn.value++;
    map.value[cell.column][cell.row] = cell.player;
    let a = isPlayerWon();
    if (a === true) {
      console.log("Player " + cell.player + " won!");
      result = JSON.parse(JSON.stringify(result))
      // result 内的数组第一个排序，其次第二个排序
      result.sort((a, b) => {
        if (a[0] === b[0]) {
          return a[1] - b[1]
        } else {
          return a[0] - b[0]
        }
      })
      // 取前五个
      result = result.slice(0, 5)
      loading.value = true
      let checkWin = await execute(contract, 'checkWin', [roomId, result])
      winner.value = cell.player
      loading.value = false
      isOver.value = true;
      console.log(checkWin)
    } else if (a === "draw") {
      isOver.value = true;
      console.log("Draw!");
    }
    cell = {};
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)
  }
  loading.value = false
}

const isPlayerWon = (mp, c) => {
  if (!mp) {
    mp = JSON.parse(JSON.stringify(map.value));
  }
  if (!c) {
    c = JSON.parse(JSON.stringify(cell));
  }
  const one = () => {
    items = 1;
    row = c.row;
    while (mp[c.column][row] === c.player && row > 0) {
      row--;
      if (mp[c.column][row] === c.player) {
        items++
        result.push([c.column, row])
      };
    }

    row = c.row;
    while (mp[c.column][row] === c.player && row < m - 1) {
      row++;
      if (mp[c.column][row] === c.player) {
        items++
        result.push([c.column, row])
      };
    }

    return items >= k ? true : false;
  };

  const two = () => {
    items = 1;

    column = c.column;
    while (mp[column][c.row] === c.player && column > 0) {
      column--;
      if (mp[column][c.row] === c.player) {
        items++
        result.push([column, c.row])
      };
    }

    column = c.column;
    while (mp[column][c.row] === c.player && column < m - 1) {
      column++;
      if (mp[column][c.row] === c.player) {
        items++
        result.push([column, c.row])
      };
    }

    return items >= k ? true : false;
  };

  const three = () => {
    items = 1;

    row = c.row;
    column = c.column;
    while (mp[column][row] === c.player && row > 0 && column > 0) {
      row++;
      column--;
      if (mp[column][row] === c.player) {
        items++
        result.push([column, row])
      };
    }

    row = c.row;
    column = c.column;
    while (mp[column][row] === c.player && row < m - 1 && column < m - 1) {
      row--;
      column++;
      if (mp[column][row] === c.player) {
        items++
        result.push([column, row])
      };
    }

    return items >= k ? true : false;
  };

  const four = () => {
    items = 1;

    row = c.row;
    column = c.column;
    while (mp[column][row] === c.player && row > 0 && column > 0) {
      row--;
      column--;
      if (mp[column][row] === c.player) {
        items++
        result.push([column, row])
      };
    }

    row = c.row;
    column = c.column;
    while (mp[column][row] === c.player && row < m - 1 && column < m - 1) {
      row++;
      column++;
      if (mp[column][row] === c.player) {
        items++
        result.push([column, row])
      };
    }

    return items >= k ? true : false;
  };

  let row,
    column,
    items,
    won = one() || two() || three() || four();
  if (won) {
    result.unshift([c.column, c.row])
  } else {
    result = []
  }
  return turn.value === m * m && won === false ? "draw" : won;
};

watch(() => store.state.contract, async (contract) => {
  if (contract) {
    getBoard()
    await getRoom()
    toRaw(contract).on('MoveMade', async (id, player, column, row) => {
      interval1 && clearInterval(interval1)
      if (player != playerType.value && id.toString() == roomId) {
        txList.value.push({ player: player, x: column, y: row })
        await getBoard()
        cell = {
          column: Number(column),
          row: Number(row),
          player: player,
        };
        let aa = isPlayerWon();
        console.log(aa)
        if (aa) {
          isOver.value = true;
          if (player == 1) {
            winner.value = 1
          } else if (player == 2) {
            winner.value = 2
          }
        } else {
          // let b = ai(map.value, player)
          // console.log(b)
          // tempMap.value = new Array(m).fill(0).map(() => new Array(m).fill(0))
          // tempMap.value[b.x][b.y] = playerType.value;
          // cell = {
          //   column: b.x,
          //   row: b.y,
          //   player: playerType.value,
          // };
        }
        cell = {};
      }
      if (player == playerType.value && id.toString() == roomId) {
        checkBlock()
      }
    })
    toRaw(contract).on('GameEnded', (id, win) => {
      console.log(id, win)
      if (id.toString() == roomId) {
        isOver.value = true
        if (win.toLocaleLowerCase() == blackPlayer.toLocaleLowerCase()) {
          winner.value = 1
        } else if (win.toLocaleLowerCase() == whitePlayer.toLocaleLowerCase()) {
          winner.value = 2
        }
      }
    })
  }
}, { immediate: true })

watch(() => isOver.value, (isOver) => {
  if (isOver && winner.value == playerType.value) {
    setTimeout(() => {
      getCanvas()
    }, 100)
  }
})

</script>

<template>
  <div class="detail flex-start">
    <n-spin size="large" :show="loading" style="min-height: 400px;">
      <div class="l">
        <div class="w">
          <canvas class="pan" ref="pan"></canvas>
          <canvas v-if="isOver && winner == playerType" id="canvas" class="firework"></canvas>
          <div ref="items" class="items">
            <div class="row flex-center" v-for="(row, rowIndex) in map" :style="{ height: cellWidth + 'px' }">
              <div v-for="(column, columnIndex) in row"
                :class="['item', ((map[columnIndex] && map[columnIndex][rowIndex] == 1) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 1)) ? 'player-1' : ((map[columnIndex] && map[columnIndex][rowIndex] == 2) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 2)) ? 'player-2' : '']"
                :style="{ width: cellWidth + 'px' }" @click="isItemClicked(columnIndex, rowIndex)">
              </div>
            </div>
          </div>
          <div v-if="isOver" class="msg">
            <div>
              <div v-if="winner == 1">Black win</div>
              <div v-if="winner == 2">White win</div>
              <div v-if="winner == 0 && isOver">Draw</div>
              <n-button type="primary" @click="() => router.push('/')" style="margin-top: 12px;">Back to
                roomList</n-button>
            </div>
          </div>
        </div>
      </div>
    </n-spin>
    <div class="r">
      <div class="r-hd border">
        <div class="players flex-center-sb">
          <div class="w">
            <div class="flex-center">
              <div class="avatar"
                :style="{ border: (!isOver && turn % 2 == 0) ? '2px solid #FF0620' : '1px solid #ccc' }">
                <img v-if="winner == 1" src="./icon.svg" alt="" class="icon">
              </div>
              <div class="info">
                <div>win: {{ blackPlayerInfo.wins }}</div>
                <div>loss: {{ blackPlayerInfo.losses }}</div>
              </div>
            </div>
            <div class="addr">{{ formatAddress(blackPlayer) }}</div>
          </div>
          <div class="vs">VS</div>
          <div class="b">
            <div class="flex-center">
              <div class="info">
                <div>win: {{ whitePlayerInfo.wins }}</div>
                <div>loss: {{ whitePlayerInfo.losses }}</div>
              </div>
              <div class="avatar"
                :style="{ border: (!isOver && turn % 2 != 0) ? '2px solid #FF0620' : '1px solid #ccc' }">
                <img v-if="winner == 2" src="./icon.svg" alt="" class="icon">
              </div>
            </div>
            <div class="addr">{{ formatAddress(whitePlayer) }}</div>
          </div>
        </div>
      </div>
      <div class="r-bd border">
        <div class="tx" v-for="(item, index) in txList">{{ item.player == 1 ? 'BLACK' : 'WHITE' }} ({{ item.x }}, {{
          item.y
        }})
          <span v-if="item.tx?.hash" @click="toScan(item.tx?.hash)">tx: {{ formatAddress(item.tx?.hash) }}</span>
          <p v-if="item.gas" style="margin-top: 4px;">gas: {{ item.gas }} BNB</p>
        </div>
      </div>
      <n-button type="primary" :disabled="(playerType == 1 && turn % 2 != 0) || (playerType == 2 && turn % 2 == 0)"
        @click="fall" style="width: 100%;">Confirm Place</n-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail {
  z-index: 1;
  text-align: center;
  // background: linear-gradient(315deg, #b8c6db 0%, #f5f7fa 74%);
  height: calc(100vh - 66px);
  padding: 24px;
  box-sizing: border-box;
  justify-content: center;

  .l {
    .w {
      position: relative;
      display: inline-block;
      transform: rotateX(180deg);
    }

    .msg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 999;
      background: rgba(0, 0, 0, .2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #fff;
      font-weight: 600;
      transform: rotateX(180deg);
    }

    canvas {
      z-index: 2;
      background: linear-gradient(225deg, #d99058 0%, #f8de7e 74%);
      border-radius: 2px 2px 6px 6px;
    }

    .firework {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9;
      opacity: .8;
    }

    .items {
      z-index: 3;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;

      .item {
        position: relative;
        display: inline-block;
        width: 35px;
        height: 35px;
        cursor: crosshair;

        &.player-1::after,
        &.player-2::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          margin-right: -50%;
          transform: translate(-50%, -50%);
          width: 33px;
          height: 33px;
          border-radius: 50%;
          box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.16), 0 -3px 6px rgba(0, 0, 0, 0.23);
        }

        &.player-1::after {
          background-image: linear-gradient(315deg, #000 0%, #444 74%);
        }

        &.player-2::after {
          background-image: linear-gradient(315deg, #999 0%, #fff 74%);
        }
      }
    }
  }

  .r {
    width: 400px;
    margin-left: 12px;
    font-size: 14px;

    .border {
      border: 1px solid rgba(239, 239, 245, 1);
      padding: 12px;
      box-sizing: border-box;
      border-radius: 6px;
    }

    .r-hd {
      .avatar {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 24px;
        border: 1px solid #ccc;
        box-sizing: border-box;

        .icon {
          position: absolute;
          top: -20px;
          width: 32px;
          height: auto;
          left: 0;
          right: 0;
          margin: auto;
        }
      }

      .addr {
        margin-top: 12px;
      }

      .info {
        line-height: 1.4;
      }

      .vs {
        font-size: 32px;
        font-weight: 500;
      }

      .w {
        .info {
          margin-left: 12px
        }

        .addr {
          text-align: left;
        }

        .avatar {
          background: #000;
        }
      }

      .b {
        .info {
          margin-right: 12px
        }

        .addr {
          text-align: right;
        }

        .avatar {
          background: #fff;
        }
      }
    }

    .r-bd {
      margin-top: 12px;
      height: 360px;
      margin-bottom: 12px;
      overflow-y: auto;

      .tx {
        text-align: left;
        font-size: 14px;
        margin-top: 14px;

        span {
          margin-left: 4px;
          color: #1684fc;
          cursor: pointer;
        }
      }
    }
  }
}
</style>
