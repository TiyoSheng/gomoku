<script setup>
import { onMounted, ref, onBeforeMount, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { contract, wallet, contractAbi } from '../config/config'
import { useMessage } from 'naive-ui'
import { Alchemy, AlchemySubscription } from "alchemy-sdk"
import { ethers } from "ethers";

const message = useMessage()
const route = useRoute()
console.log(route)
const pan = ref(null)
const items = ref(null)
const isOver = ref(false)
const map = ref(new Array(m + 1).fill(0).map(() => new Array(m).fill(0)))
const tempMap = ref(new Array(m + 1).fill(0).map(() => new Array(m).fill(0)))
const loading = ref(false)
const playerType = ref(0)
// router 获取参数
const roomId = route.params.id
const m = 15;
const cellWidth = 35
const boardWidth = m * cellWidth
const k = 5
let cell = {}
let turn = 0
let result = []
let room = {}
let blackPlayer = ''
let whitePlayer = ''

const getAlchemy = () => {
  let settings = {
    apiKey: 'xQr0n2BqF1Hkkuw5_0YiEXeyQdSYoW1u',
    network: 'eth-goerli'
  }
  let alchemy = new Alchemy(settings)
  return alchemy
}

const alchemy = getAlchemy()

const getBoard = async () => {
  loading.value = true
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
    turn = count
  } catch (error) {
    console.log(error)
    message.error(error)
  }
  loading.value = false
}

const getRoomList = async () => {
  const res = await contract.getWaitingRoom()
  let roomList = res
  // 通过 roomId 获取房间信息
  console.log(roomId, roomList)
  room = roomList.find(item => item.roomId.toString() == roomId)
  blackPlayer = room.blackPlayer
  whitePlayer = room.whitePlayer
  if (blackPlayer == wallet?.address) {
    playerType.value = 1
  } else if (whitePlayer == wallet?.address) {
    playerType.value = 2
  }
}

onBeforeMount(async () => {
  getBoard()
  await getRoomList()
  console.log(room)
  alchemy.core.getTokenBalances(wallet?.address).then(async () => {
    message.success("开始监听")
  })
  alchemy.ws.on({
    method: AlchemySubscription.MINED_TRANSACTIONS,
    addresses: [
      {
        to: "0x4f91f5Bce22879562FA10D83C0d5938bf0F5182a",
      },
    ],
  }, async (res) => {
    // res = res.transaction
    let input = res.transaction.input
    const iface = new ethers.utils.Interface(contractAbi)
    let args = iface.decodeFunctionData(input.slice(0,10), input)
    let functionName = iface.getFunction(input.slice(0,10)).name
    if (functionName == 'makeMove') {
      // 判断对手address
      let address = ''
      if (playerType.value == 1) {
        address = whitePlayer
      } else if (playerType.value == 2) {
        address = blackPlayer
      }
      if (args.roomId.toString() == roomId && res.transaction.from.toLocaleLowerCase() == address.toLocaleLowerCase()) {
        getBoard()
      }
    } 
  })
})
onMounted(() => {
  setBoard()
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
  // 如果不是当前玩家，不允许点击
  if (playerType.value == 1 && turn % 2 != 0) {
    // 英文
    message.error('It is not your turn')
    return
  } else if (playerType.value == 2 && turn % 2 == 0) {
    message.error('It is not your turn')
    return
  }
  if (isOver.value) return;
  tempMap.value = new Array(m).fill(0).map(() => new Array(m).fill(0))
  if (map.value[column][row] === 0) {
    console.log(turn)
    let player = turn % 2 === 0 ? 1 : 2;
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
  if (!cell.column || !cell.row) {
    message.error('Please select a cell')
    return;
  }
  loading.value = true
  try {
    let tx = await contract.makeMove(roomId, cell.column, (cell.row))
    await tx.wait()
    turn++;
    map.value[cell.column][cell.row] = cell.player;
    let a = isPlayerWon();
    console.log(a)
    if (a === true) {
      isOver.value = true;
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
      console.log(result)
      let checkWin = await contract.checkWin(roomId, result)
      console.log(checkWin)
      await checkWin.wait()
    } else if (a === "draw") {
      isOver.value = true;
      console.log("Draw!");
    }
  } catch (error) {
    console.log(error)
    message.error(error)
  }
  loading.value = false
  cell = {};
}

const isPlayerWon = () => {
  let mp = JSON.parse(JSON.stringify(map.value));
  const one = () => {
    items = 1;
    row = cell.row;
    while (mp[cell.column][row] === cell.player && row > 0) {
      row--;
      if (mp[cell.column][row] === cell.player) {
        items++
        result.push([cell.column, row ])
      };
    }

    row = cell.row;
    while (mp[cell.column][row] === cell.player && row < m - 1) {
      row++;
      if (mp[cell.column][row] === cell.player) {
        items++
        result.push([cell.column, row ])
      };
    }

    return items >= k ? true : false;
  };

  const two = () => {
    items = 1;

    column = cell.column;
    while (mp[column][cell.row] === cell.player && column > 0) {
      column--;
      if (mp[column][cell.row] === cell.player) {
        items++
        result.push([column, cell.row ])
      };
    }

    column = cell.column;
    while (mp[column][cell.row] === cell.player && column < m - 1) {
      column++;
      if (mp[column][cell.row] === cell.player) {
        items++
        result.push([column, cell.row ])
      };
    }

    return items >= k ? true : false;
  };

  const three = () => {
    items = 1;

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row > 0 && column > 0) {
      row++;
      column--;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row ])
      };
    }

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row < m - 1 && column < m - 1) {
      row--;
      column++;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row ])
      };
    }

    return items >= k ? true : false;
  };

  const four = () => {
    items = 1;

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row > 0 && column > 0) {
      row--;
      column--;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row ])
      };
    }

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row < m - 1 && column < m - 1) {
      row++;
      column++;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row ])
      };
    }

    return items >= k ? true : false;
  };

  let row,
    column,
    items,
    won = one() || two() || three() || four();
  if (won) {
    result.unshift([cell.column, cell.row])
  } else {
    result = []
  }
  return turn === m * m && won === false ? "draw" : won;
};


</script>

<template>
  <div class="detail flex-start">
    <n-spin size="large" :show="loading" style="flex: 1; min-height: 400px;">
      <div class="l">
        <div class="w">
          <canvas class="pan" ref="pan"></canvas>
          <div ref="items" class="items">
            <div class="row flex-center" v-for="(row, rowIndex) in map" :style="{ height: cellWidth + 'px' }">
              <div v-for="(column, columnIndex) in row"
                :class="['item', ((map[columnIndex] && map[columnIndex][rowIndex] == 1) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 1)) ? 'player-1' : ((map[columnIndex] && map[columnIndex][rowIndex] == 2) || (tempMap[columnIndex] && tempMap[columnIndex][rowIndex] == 2)) ? 'player-2' : '']"
                :style="{ width: cellWidth + 'px' }" @click="isItemClicked(columnIndex, rowIndex)">
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>
    <div class="r">
      <n-button type="primary" @click="fall">End Fall</n-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail {
  z-index: 1;
  text-align: center;
  background: linear-gradient(315deg, #b8c6db 0%, #f5f7fa 74%);
  height: calc(100vh - 66px);
  padding: 24px;
  box-sizing: border-box;

  .l {
    .w {
      position: relative;
      display: inline-block;
      transform: rotateX(180deg);
    }

    canvas {
      z-index: 2;
      background: linear-gradient(225deg, #d99058 0%, #f8de7e 74%);
      border-radius: 2px 2px 6px 6px;
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

}</style>
