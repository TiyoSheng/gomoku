import { ethers } from 'ethers'
import { contractAbi, contractAddress } from '../config/config.js'
// 引入ai
import { ai } from './ai.js'
// 引入isPlayerWon
import { isPlayerWon } from './isPlayerWon.js'

const execute = async (contract, method_name, params) => {
  // const data = contract.interface.encodeFunctionData(method_name, params);
  // let target_contract_address = contract.address
  // console.log("执行合约", target_contract_address, method_name)
  // let tx = await aa_contract.connect(signer).execute(target_contract_address, 0, data);
  const gasPrice = await provider.getGasPrice();
  const gasLimit = await contract.estimateGas[method_name](...params);
  let tx = await contract[method_name](...params, { gasPrice: Math.floor(gasPrice * 1.2), gasLimit: Math.floor(gasLimit * 2) });
  console.log('execute', tx)
  let w = await tx.wait();
  return Object.assign(w, tx);
}


let roomId = -1
let lastMoveBlock = 0
let player = 1
let interval1 = null
let aaAddress = ''
let provider = null
let contract = null

const checkBlock = async () => {
  console.log('checkBlock')
  interval1 && clearInterval(interval1)
  let room = await contract.rooms(roomId)
  // get getBlockNumber
  interval1 = setInterval(async () => {
    // getBlockNumber
    let blockNumber = await provider.getBlockNumber()
    if (blockNumber - Number(room.lastMoveBlock) > 150) {
      console.log('checkBlock', 'checkOverTime')
      interval1 && clearInterval(interval1)
      try {
        let tx = await execute(contract, 'checkOverTime', [roomId])
        console.log('checkOverTime', tx.hash)
      } catch (error) {
        console.log(error)
        // message.error(error.reason || error.data?.message || error.message)
      }
    }
  }, 10000)
}

// 监听
const listen = async () => {
  // 监听事件
  contract.on('RoomCreated', (id, player, position) => {
    console.log('RoomCreated', id, player, position)
    // if (player.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
    //   roomId = id
    //   lastMoveBlock = 0
    // }
  })

  contract.on('GameStarted', async (id, blackPlayer, whitePlayer) => {
    console.log('GameStarted', id, blackPlayer, whitePlayer)
    if (blackPlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase() || whitePlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
      // 获取棋盘
      roomId = id.toString()
      if (blackPlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
        player = 1
      } else if (whitePlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
        player = 2
        checkBlock()
      }
    }
  })

  contract.on('MoveMade', async (id, position, x, y) => {
    console.log('MoveMade', id.toString(), position, Number(x), Number(y), player, roomId)
    interval1 && clearInterval(interval1)
    if (id.toString() == roomId) {
      if (position != player) {
        const map = await contract.getBoard(roomId)
        let result1 = isPlayerWon(map, { column: Number(x), row: Number(y), player: position })
        if (result1 && result1.length == 5) {
          console.log('我输了')
          return
        }
        console.log('ss')
        let cell = ai(map, player)
        console.log(cell)
        await makeMove(cell.x, cell.y)
        // 判断是否结束
        let mp = JSON.parse(JSON.stringify(map))
        mp[cell.x][cell.y] = player
        let result = isPlayerWon(mp, { column: cell.x, row: cell.y, player: player })
        if (result && result.length == 5) {
          console.log('我赢了')
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
          await execute(contract, 'checkWin', [roomId, result])
        }
      }
      if (position == player) {
        checkBlock()
      }
    }
  })

  contract.on('GameEnded', (id, winner) => {
    console.log('GameEnded', id.toString(), winner)
    setAddressRoomId(aaAddress, 0)
    removeListener()
    // if (id.toString() == roomId) {
    //   setTimeout(() => {
    //     getRoomList()
    //   }, 60000)
    // }
  })
}

const setAddressRoomId = async (address, roomId) => {
  // feat post /api/set_game
  const response = await fetch('https://gomoku-api.vercel.app/api/set_game', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address: address.toLocaleLowerCase(),
      roomid: roomId
    })
  })
  const data = await response.json()
  console.log(data)
}

// 加入游戏
export const aiJoinRoom = async (rId, privateKey, rpcUrl) => {
  roomId = rId
  provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  aaAddress = wallet.address
  contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  listen(contract)
  await execute(contract, 'joinRoom', [rId])
  setAddressRoomId(aaAddress, rId)
}

export const aiInit = async (rId, privateKey, rpcUrl) => {
  roomId = rId
  provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  aaAddress = wallet.address
  contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  listen(contract)
  await getRoomList()
}

// 获取房间列表
const getRoomList = async () => {
  const rooms = await contract.getWaitingRoom()
  // 筛选未开始的
  let myRoom = null
  rooms.forEach(room => {
    if (room.roomId == roomId) {
      myRoom = room
    }
  });
  if (myRoom.gameState == 2) {
    console.log('游戏已结束')
    removeListener()
    return
  }
  if (myRoom.gameState == 0) {
    console.log('游戏未开始')
    await execute(contract, 'joinRoom', [roomId])
    setAddressRoomId(aaAddress, roomId)
    return
  }
  const map = await contract.getBoard(roomId)
  if (myRoom.blackPlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase() || myRoom.whitePlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
    if (myRoom.blackPlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
      player = 1
      if (myRoom.currentPlayer == 1) {
        // checkBlock()
        const cell = ai(map, player)
        await makeMove(cell.x, cell.y)
      } else {
        checkBlock()
      }
    } else if (myRoom.whitePlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()) {
      player = 2
      if (myRoom.currentPlayer == 2) {
        // checkBlock()
        const cell = ai(map, player)
        await makeMove(cell.x, cell.y)
      } else {
        checkBlock()
      }
    }
  }
}

// 落子
const makeMove = async (x, y) => {
  await execute(contract, 'makeMove', [roomId, x, y])
}

// 移除监听
export const removeListener = () => {
  contract && contract.removeAllListeners('RoomCreated')
  contract && contract.removeAllListeners('GameStarted')
  contract && contract.removeAllListeners('MoveMade')
  contract && contract.removeAllListeners('GameEnded')
  interval1 && clearInterval(interval1)
}
