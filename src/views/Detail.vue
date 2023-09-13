<script setup>
import { onMounted, ref, onBeforeUnmount, watch, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useGlobalStore } from '../hooks/globalStore'
import { execute } from '../libs/inject'
import firework from '../libs/firework';
import { ethers } from "ethers";
import makeBlockie from 'ethereum-blockies-base64';

const m = 15;
// const cellWidth = 35
// 52/1680
// 获取可见范围宽度
console.log(document.documentElement.clientWidth)
const documentClientWidth = document.documentElement.clientWidth
const cellWidth = documentClientWidth >= 1680 ? 52 : 44
const boardWidth = m * cellWidth
const k = 5
let cell = {}
let result = []
let room = {}
let interval1 = null

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
const blackPlayer = ref('')
const whitePlayer = ref('')
const txList = ref([])
const winner = ref(0)
const turn = ref(0)
const block = ref(50)
const nowPlayer = ref(1)

const roomId = route.params.id


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
  blackPlayer.value = room.blackPlayer
  whitePlayer.value = room.whitePlayer
  if (blackPlayer.value == store.state.aaAddress) {
    playerType.value = 1
  } else if (whitePlayer.value == store.state.aaAddress) {
    playerType.value = 2
  }
  if (room.gameState == 2) {
    isOver.value = true
    if (room.winner.toLocaleLowerCase() == blackPlayer.value.toLocaleLowerCase()) {
      winner.value = 1
    } else if (room.winner.toLocaleLowerCase() == whitePlayer.value.toLocaleLowerCase()) {
      winner.value = 2
    }
  }
  blackPlayerInfo.value = await contract.players(blackPlayer.value)
  whitePlayerInfo.value = await contract.players(whitePlayer.value)
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
      block.value = 0
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
    } else {
      console.log(blockNumber, Number(room.lastMoveBlock))
      block.value = 50 - (blockNumber - Number(room.lastMoveBlock))
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
  elementBoard.setAttribute("width", boardWidth * 2);
  elementBoard.setAttribute("height", boardWidth * 2);
  elementBoard.style.width = boardWidth + "px";
  elementBoard.style.height = boardWidth + "px";
  elementContext.beginPath();
  elementContext.lineWidth = "1";
  elementContext.strokeStyle = "#6d4c36";

  for (let i = 0; i < m; i++) {
    elementContext.moveTo(cellWidth * 2 * i + cellWidth, cellWidth);
    elementContext.lineTo(
      cellWidth * i * 2 + cellWidth,
      boardWidth * 2 - cellWidth
    );
    elementContext.moveTo(cellWidth, cellWidth * i * 2 + cellWidth);
    elementContext.lineTo(
      boardWidth * 2 - cellWidth,
      cellWidth * i * 2 + cellWidth
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
          block.value = 50
        checkBlock()
        }
        cell = {};
      }
      if (player == playerType.value && id.toString() == roomId) {
        block.value = 50
        checkBlock()
      }
      if (player == 1) {
        nowPlayer.value = 2
      } else if (player == 2) {
        nowPlayer.value = 1
      }
    })
    toRaw(contract).on('GameEnded', (id, win) => {
      console.log(id, win)
      if (id.toString() == roomId) {
        isOver.value = true
        if (win.toLocaleLowerCase() == blackPlayer.value.toLocaleLowerCase()) {
          winner.value = 1
        } else if (win.toLocaleLowerCase() == whitePlayer.value.toLocaleLowerCase()) {
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
      <div class="l">
        <n-spin size="large" :show="loading" style="min-height: 400px;">
        <div class="w">
          <canvas class="pan" ref="pan"></canvas>
          <canvas v-if="isOver && winner == playerType" id="canvas" class="firework"></canvas>
          <div ref="items" class="items">
            <div class="row flex-center" v-for="(row, rowIndex) in map" :style="{ height: cellWidth + 'px' }">
              <div v-for="(column, columnIndex) in row"
                :class="['item', ((map[columnIndex] && map[columnIndex][rowIndex] == 1) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 1)) ? 'player-1' : ((map[columnIndex] && map[columnIndex][rowIndex] == 2) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 2)) ? 'player-2' : '']"
                :style="{ width: cellWidth + 'px', height: cellWidth + 'px' }"
                @click="isItemClicked(columnIndex, rowIndex)">
                <div class="after" :style="{ width: (cellWidth - 2) + 'px', height: (cellWidth - 2) + 'px' }"></div>
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
      </n-spin>
      </div>
    <div class="r">
      <div class="r-hd">
        <div class="players">
          <div class="block w">
            <div v-if="playerType == 2" class="your">Your</div>
            <img v-if="winner == 2" src="../assets/images/white_win.svg" alt="" class="bg">
            <img v-else-if="winner == 0 && nowPlayer == 2" src="../assets/images/white_a.svg" alt="" class="bg">
            <img v-else src="../assets/images/white.svg" alt="" class="bg">
            <div class="user-info">
              <div class="flex-center">
                <div :class="['avatar', winner == 2 ? 'winner' : '']">
                  <img v-if="winner == 2" src="../assets/images/icon.svg" alt="" class="icon">
                  <img v-if="whitePlayer" :src="makeBlockie(whitePlayer)" class="avatar-img" />
                  <img src="../assets/images/player_w.svg" alt="" class="player">
                </div>
                <div class="info">
                  <div v-if="!winner" class="down-time"><span :style="{color: nowPlayer == 2 ? '#FED863' : 'rgba(255, 255, 255, 0.20)'}">{{ nowPlayer == 2 ? block : '00' }}</span>Blocks</div>
                  <div v-else class="result" :style="{color: winner == 2 ? '#9DFF85' : '#FF6161'}">{{ winner == 2 ? 'Win' : 'Loss' }}</div>
                  <div class="addr"><span>white</span>{{ formatAddress(whitePlayer) }}</div>
                </div>
              </div>
              <div class="victory">
                <div><span>{{ whitePlayerInfo.wins }}</span>Win</div>
                <p class="line"></p>
                <div><span style="color: #FF6161;">{{ whitePlayerInfo.losses }}</span>Loss</div>
              </div>
            </div>
          </div>
          <div class="vs"><img src="../assets/images/vs.png" alt=""></div>
          <div class="block b">
            <div v-if="playerType == 1" class="your">Your</div>
            <img v-if="winner == 1" src="../assets/images/black_win.svg" alt="" class="bg">
            <img v-else-if="winner == 0 && nowPlayer == 1" src="../assets/images/black_a.svg" alt="" class="bg">
            <img v-else src="../assets/images/black.svg" alt="" class="bg">
            <div class="user-info">
              <div class="flex-center">
                <div class="info">
                  <div v-if="!winner" class="down-time"><span :style="{color: nowPlayer == 1 ? '#FED863' : 'rgba(255, 255, 255, 0.20)'}">{{ nowPlayer == 1 && block > 0 ? block : '00' }}</span>Blocks</div>
                  <div v-else class="result" :style="{color: winner == 1 ? '#9DFF85' : '#FF6161'}">{{ winner == 1 ? 'Win' : 'Loss' }}</div>
                  <div class="addr"><span>Black</span>{{ formatAddress(blackPlayer) }}</div>
                </div>
                <div :class="['avatar', winner == 1 ? 'winner' : '']">
                  <img v-if="winner == 1" src="../assets/images/icon.svg" alt="" class="icon">
                  <img v-if="blackPlayer" :src="makeBlockie(blackPlayer)" class="avatar-img" />
                  <img src="../assets/images/player_b.svg" alt="" class="player">
                </div>
              </div>
              <div class="victory">
                <div><span>{{ blackPlayerInfo.wins }}</span>Win</div>
                <p class="line"></p>
                <div><span style="color: #FF6161;">{{ blackPlayerInfo.losses }}</span>Loss</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="r-bd">
        <div class="tag">🌈 Your Steps</div>
        <div class="tx-w">
          <div class="tx" v-for="(item, index) in txList">
            <img :src="makeBlockie(item.player == 1 ? blackPlayer : whitePlayer)" alt="" class="tx-avatar">
            <div class="tx-address">{{ formatAddress(item.player == 1 ? blackPlayer : whitePlayer) }}:</div>
            <img v-if="item.player == 1" src="../assets//images/player_b.svg" alt="" class="tx-player">
            <img v-else src="../assets//images/player_w.svg" alt="" class="tx-player">
            <div class="step">{{ item.player == 1 ? 'Black' : 'White' }} ({{ item.x }},{{ item.y }})</div>
            <span v-if="item.tx?.hash" @click="toScan(item.tx?.hash)" class="tx-hash">tx: {{ formatAddress(item.tx?.hash)
            }}</span>
            <!-- <p v-if="item.gas" style="margin-top: 4px;">gas: {{ item.gas }} BNB</p> -->
          </div>
        </div>

      </div>
      <div @click="fall" style="width: 100%;"
        :class="['confirm-btn', (playerType == 1 && turn % 2 != 0) || (playerType == 2 && turn % 2 == 0) ? 'disabled' : '']">
        Confirm Place</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail {
  z-index: 1;
  text-align: center;
  height: calc(100vh - 78px);
  padding: 24px;
  box-sizing: border-box;
  justify-content: center;

  .l {
    background: linear-gradient(225deg, #d99058 0%, #f8de7e 74%);
    border-radius: 3px 3px 8px 8px;
    padding: 18px;
    box-sizing: border-box;

    .w {
      position: relative;
      display: inline-block;
      transform: rotateX(180deg);
    }

    .msg {
      position: absolute;
      top: -18px;
      bottom: -18px;
      left: -18px;
      right: -18px;
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
    }

    .firework {
      position: absolute;
      top: -18px;
      bottom: -18px;
      left: -18px;
      right: -18px;
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

        &.player-1 .after,
        &.player-2 .after {

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

        &.player-1 .after {
          background-image: linear-gradient(315deg, #000 0%, #444 74%);
        }

        &.player-2 .after {
          background-image: linear-gradient(315deg, #999 0%, #fff 74%);
        }
      }
    }
  }

  .r {
    width: 640px;
    flex: 0 0 640px;
    margin-left: 24px;
    font-size: 14px;

    .border {
      border: 1px solid rgba(239, 239, 245, 1);
      padding: 12px;
      box-sizing: border-box;
      border-radius: 6px;
    }

    .r-hd {
      .players {
        position: relative;
        width: 100%;
        height: 196px;
        font-size: 0;

        .bg {
          width: 100%;
          height: auto;
        }

        .vs {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          margin: auto;
          width: 112px;
          height: 112px;
          z-index: 9;

          img {
            width: 112px;
            height: auto;
          }
        }

        .block {
          position: absolute;
          right: 0;
          top: 0;
          width: 338px;

          &.w {
            left: 0;
            .your {
              border-radius: 0px 8px;
              background: rgba(254, 216, 99, 0.20);
              backdrop-filter: blur(6px);
              position: absolute;
              top: 0;
              left: 0;
              display: flex;
              padding: 4px 10px;
              justify-content: center;
              align-items: center;
              color: #FED863;
              font-family: Montserrat-bold;
              font-size: 13px;
              font-style: normal;
              line-height: normal;
              text-transform: capitalize;
            }
          }

          &.b {
            right: 0;
            .your {
              border-radius: 0px 8px;
              background: rgba(254, 216, 99, 0.20);
              backdrop-filter: blur(6px);
              position: absolute;
              top: 0;
              right: 0;
              display: flex;
              padding: 4px 10px;
              justify-content: center;
              align-items: center;
              color: #FED863;
              font-family: Montserrat-bold;
              font-size: 13px;
              font-style: normal;
              line-height: normal;
              text-transform: capitalize;
            }

            .user-info {
              padding: 24px 24px 24px 74px;
              text-align: right;

              .info {
                margin-left: 0;
                margin-right: 16px;
                text-align: right;
              }

              .avatar {
                .player {
                  left: 4px;
                  right: auto;
                }
              }
            }
          }

          .user-info {
            width: 100%;
            height: 100%;
            padding: 24px 74px 24px 24px;
            box-sizing: border-box;
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;

            .avatar {
              position: relative;
              width: 80px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 24px;
              box-sizing: border-box;
              &.winner {
                border-radius: 50%;
                border: 2px solid #FED863;
              }

              .icon {
                position: absolute;
                top: -26px;
                width: 46px;
                height: auto;
                right: -10px;
                margin: auto;
              }

              .avatar-img {
                width: 68px;
                height: auto;
                border-radius: 50%;
              }

              .player {
                position: absolute;
                right: 4px;
                bottom: 4px;
                border-radius: 24px;
                width: 24px;
                height: auto;
                background: rgba(0, 0, 0, .2);
              }
            }

            .info {
              text-align: left;
              margin-left: 16px;

              .down-time {
                color: rgba(255, 255, 255, 0.20);
                font-family: Montserrat-Medium;
                font-size: 13px;
                font-style: italic;
                font-weight: 500;
                line-height: normal;
                text-transform: capitalize;

                span {
                  font-family: Montserrat-600;
                  margin-right: 4px;
                  font-size: 36px;
                  font-style: normal;
                }
              }

              .result {
                color: #9DFF85;
                font-family: Montserrat-bold;
                font-size: 36px;
                font-style: italic;
                line-height: normal;
                text-transform: capitalize;

              }

              .addr {
                color: rgba(255, 255, 255, 0.50);
                font-family: Montserrat-Regular;
                font-size: 12px;
                font-style: normal;
                font-weight: 400;
                line-height: normal;
                text-transform: capitalize;

                span {
                  color: #FFF;
                  font-family: Montserrat-bold;
                  font-size: 13px;
                  margin-right: 8px;
                }
              }
            }
          }

          .victory {
            margin-top: 20px;
            display: flex;
            width: 240px;
            padding: 12px 16px;
            align-items: flex-center;
            box-sizing: border-box;
            border-radius: 6px;
            background: #14181E;
            height: 48px;

            div {
              color: rgba(255, 255, 255, 0.50);
              font-family: Montserrat-Regular;
              font-size: 13px;
              font-style: normal;
              font-weight: 400;
              line-height: normal;
              text-transform: capitalize;
              width: 88px;
              text-align: left;

              span {
                color: #9DFF85;
                font-family: Montserrat-Medium;
                font-size: 20px;
                margin-right: 4px;
              }
            }

            .line {
              width: 1px;
              height: 20px;
              margin: 0 16px;
              background-color: #292B2F;
            }
          }
        }
      }
    }

    .r-bd {
      margin-top: 24px;
      border-radius: 8px;
      border: 1px solid #292B2F;
      background: #14171E;
      box-sizing: border-box;

      .tag {
        height: 50px;
        display: flex;
        align-items: center;
        padding: 0 24px;
        box-sizing: border-box;
        color: rgba(255, 255, 255, 0.80);
        font-family: Montserrat-Medium;
        font-size: 15px;
        font-style: normal;
        line-height: normal;
        text-transform: capitalize;
        background: #1F2128;
      }

      .tx-w {
        height: 460px;
        overflow-y: auto;
      }

      .tx {
        height: 72px;
        display: flex;
        align-items: center;
        padding: 0 24px;
        box-sizing: border-box;
        color: #FFF;
        font-family: Montserrat-Regular;
        font-size: 15px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        letter-spacing: 0.6px;
        text-transform: capitalize;
        border-bottom: 1px solid #292B2F;

        .tx-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .tx-player {
          margin-left: 16px;
          width: 16px;
          height: 16px;
        }

        .tx-hash {
          margin-left: 16px;
          color: rgba(255, 255, 255, 0.40);
          font-family: Montserrat-Regular;
          font-size: 15px;
          font-style: normal;
          font-weight: 400;
          line-height: normal;
          letter-spacing: 0.6px;
          text-transform: capitalize;
          cursor: pointer;
        }
      }
    }

    .confirm-btn {
      margin-top: 24px;
      border-radius: 8px;
      background: #3760D7;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      font-family: Montserrat-600;
      font-size: 18px;
      font-style: normal;
      font-weight: 600;
      line-height: normal;
      letter-spacing: 0.72px;
      text-transform: capitalize;
      cursor: pointer;

      &.disabled {
        background: #2D323B;
        color: rgba(255, 255, 255, 0.40);
        cursor: not-allowed;
      }
    }
  }
}

// 屏幕宽度小于1680
@media screen and (max-width: 1680px) {
  .detail {
    padding-top: 12px;
    .r {
      .tx-w {
        height: 340px !important;
      }
    }
  }
}
</style>
