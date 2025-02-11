<script setup>
import { ref, onBeforeUnmount, watch, toRaw, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import Connect from '../components/Connect.vue'
import { execute } from '../libs/inject'
import { useGlobalStore } from '../hooks/globalStore'
import { wallet } from './wallet'
import { aiJoinRoom, removeListener } from '../ai/index.js'

const { store } = useGlobalStore()
const message = useMessage()
const router = useRouter()
const roomList = ref([])
const loading = ref(false)
const createLoading = ref(false)
const positionValue = ref(1)
const isWaiting = ref(false)
const createRoomId = ref(-1)
const options = [
  { label: 'black', value: 1 },
  { label: 'white', value: 2 },
]

const toRoom = (id) => {
  router.push(`/room/${id}`)
}

const joinRoom = async (id) => {
  if (store.state.balance == 0) {
    message.error('Gas余额不足，请先充值')
    return
  } else if (!store.state.aaAddress) {
    message.error('请先创建AA钱包')
    return
  }
  id = Number(id)
  console.log(id)
  loading.value = true
  let contract = toRaw(store.state.contract)
  try {
    const tx = await execute(contract, 'joinRoom', [id])
    console.log(tx)
    // message.success('Join Room Success')
    // getRoomList()
    // router.push(`/room/${id}`)
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)
  }
  loading.value = false
}

const createRoom = async () => {
  if (store.state.balance == 0) {
    message.error('Gas余额不足，请先充值')
    return
  } else if (!store.state.aaAddress) {
    message.error('请先创建AA钱包')
    return
  }
  createLoading.value = true
  let contract = toRaw(store.state.contract)
  try {
    const tx = await execute(contract, 'createRoom', [positionValue.value])
    isWaiting.value = true
    // message.success('Create Room Success')
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)

  }
  createLoading.value = false
}

const startAi = async (roomId) => {
  const addressList = wallet.map(e => e.address.toLocaleLowerCase())
  const response = await fetch(`https://gomoku-api.vercel.app/api/get_room?address_list=${addressList.join(',')}`)
  const data = await response.json()
  const canUseAddress = []
  for (let i = 0; i < wallet.length; i++) {
    if (!data[wallet[i].address.toLocaleLowerCase()]) {
      canUseAddress.push(wallet[i].address.toLocaleLowerCase())
    }
  }
  const canUseWallet = wallet.filter(e => e.address.toLocaleLowerCase() == canUseAddress[0].toLocaleLowerCase())[0]
  await aiJoinRoom(roomId, canUseWallet.privateKey, store.state.rpcUrl)
}

const getRoomList = async () => {
  loading.value = true
  let contract = toRaw(store.state.contract)
  console.log(contract)
  const res = await contract.getWaitingRoom()
  roomList.value = res.filter(e => e.gameState != 2)
  loading.value = false
  console.log(store.state.aaAddress)
  // 判断list中是否有自己的房间 blackPlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase() || whitePlayer.toLocaleLowerCase() == aaAddress.toLocaleLowerCase()
  const myRooms = res.filter(e => e.blackPlayer.toLocaleLowerCase() == store.state.aaAddress.toLocaleLowerCase() || e.whitePlayer.toLocaleLowerCase() == store.state.aaAddress.toLocaleLowerCase())
  // 获取已开始的房间 gameState == 1
  const startedRooms = myRooms.filter(e => e.gameState == 1)
  // 判断已开始的房间中，是否有房间的白棋或者黑棋地址是wallet中的地址
  for (let i = 0; i < startedRooms.length; i++) {
    if (wallet.map(e => e.address.toLocaleLowerCase()).includes(startedRooms[i].blackPlayer.toLocaleLowerCase()) || wallet.map(e => e.address.toLocaleLowerCase()).includes(startedRooms[i].whitePlayer.toLocaleLowerCase())) {
      router.push(`/room/${startedRooms[i].roomId}`)
      return
    }
  }
  // 获取还未开始的房间 gameState == 0
  const waitingRooms = myRooms.filter(e => e.gameState == 0)
  if (waitingRooms.length > 0) {
    const roomId = Number(waitingRooms[0].roomId)
    setTimeout(() => {
      startAi(roomId)
    }, 10000)
  }
}

const getPlayers = (room) => {
  let count = 0
  if (room.blackPlayer != '0x0000000000000000000000000000000000000000') {
    count++
  }
  if (room.whitePlayer != '0x0000000000000000000000000000000000000000') {
    count++
  }
  return count
}

const isShowJoin = (room) => {
  // gameState == 0 并且 blackPlayer，whitePlayer不等于当前钱包地址
  if (room.gameState == 0 && room.blackPlayer != store.state.aaAddress && room.whitePlayer != store.state.aaAddress) {
    return true
  }
}

watch(() => store.state.contract, (contract) => {
  if (contract) {
    getRoomList()
    toRaw(store.state.contract).removeAllListeners('RoomCreated')
    toRaw(store.state.contract).removeAllListeners('GameStarted')
    toRaw(store.state.contract).removeAllListeners('GameEnded')
    toRaw(contract).on('RoomCreated', (id, player, position) => {
      console.log(id, player, position)
      if (player.toLocaleLowerCase() == store.state.aaAddress.toLocaleLowerCase()) {
        createRoomId.value = id
        isWaiting.value = true
      }
      getRoomList()
    })
    toRaw(contract).on('GameStarted', (id, player1, player2) => {
      console.log(id, player1, player2)
      if (player1.toLocaleLowerCase() == store.state.aaAddress.toLocaleLowerCase() || player2.toLocaleLowerCase() == store.state.aaAddress.toLocaleLowerCase()) {
        router.push(`/room/${id}`)
      }
      getRoomList()
    })
    toRaw(contract).on('GameEnded', (roomId, winner) => {
      console.log(roomId, winner)
      getRoomList()
    })
  }
}, { immediate: true })

onBeforeUnmount(() => {
  toRaw(store.state.contract).removeAllListeners('RoomCreated')
  toRaw(store.state.contract).removeAllListeners('GameStarted')
  toRaw(store.state.contract).removeAllListeners('GameEnded')
  removeListener()
})
</script>
<template>
  <div class="home flex-start">
    <n-spin size="large" :show="loading" style="flex: 0 0 746px; height: 100%;">
      <div class="l">
        <div class="table">
          <div class="thead">
            <div class="tr">
              <th>Room ID</th>
              <th>Players</th>
              <th>Position</th>
              <th>Status</th>
              <th>Action</th>
            </div>
          </div>
          <div class="tbody">
            <div class="tr" v-for="(room, index) in roomList" :key="index">
              <td>{{ room.roomId.toString() }}</td>
              <td>{{ getPlayers(room) }} / 2</td>
              <td>
                <img v-if="room.currentPlayer == 2" src="../assets/images/blackIcon.svg" alt="">
                <img v-if="room.currentPlayer == 1" src="../assets/images/whiteIcon.svg" alt="">
                {{ room.currentPlayer == 1 ? 'black' : 'white' }}
              </td>
              <td> <span class="status">{{ room.gameState == 0 ? 'waiting' : room.gameState == 1 ? 'started' :
                room.gameState == 2 ? 'ended' :
                  '' }}</span></td>
              <td>
                <div class="join-btn" v-if="isShowJoin(room)" @click="joinRoom(room.roomId)">Join</div>
                <div class="join-btn"
                  v-if="room.gameState == 1 && (room.blackPlayer == store.state.aaAddress || room.whitePlayer == store.state.aaAddress)"
                  @click="toRoom(room.roomId)">Join</div>
              </td>
            </div>
          </div>
        </div>
      </div>
    </n-spin>
    <div>
      <n-spin size="large" :show="createLoading">
        <div v-if="!isWaiting" class="r">
          <div class="title">Create Room</div>
          <div class="select">
            <p>Select Your Position, black frist ⬇️</p>
            <div class="options">
              <div v-for="item in options"
                :class="['options-item', positionValue == item.value ? 'options-item-a' : '']" :key="item.value"
                @click="() => positionValue = item.value">{{ item.label }}</div>
            </div>
          </div>
          <div class="create-btn" style="width: 100%; margin-top: 24px;" @click="createRoom">✨ create room</div>
        </div>
        <div v-else class="r">
          <div class="title">Waiting...</div>
          <div class="select" v-if="createRoomId > -1">
            <p>Your roomId is <span>{{ createRoomId }}</span></p>
          </div>
        </div>
      </n-spin>
      <Connect />
    </div>

  </div>
</template>

<style scoped lang="scss">
.home {
  height: calc(100vh - 78px);
  padding: 32px 0;
  box-sizing: border-box;
  justify-content: center;

  .l {
    width: 746px;
    height: 100%;
    padding: 10px;
    border-radius: 12px;
    background: #FFF;
    box-sizing: border-box;

    .table {
      .thead {
        width: 726px;
        border-radius: 8px;
        overflow: hidden;

        .tr {
          display: flex;
          align-items: center;
          width: 726px;
          border-radius: 8px;

          th {
            flex: 1;
            align-items: center;
            background: #F1F2F6;
            height: 46px;
            display: flex;
            align-items: center;
            color: #121318;
            font-family: 'Montserrat-Medium';
            font-size: 15px;
            font-style: normal;
            font-weight: 500;
            line-height: normal;
            text-transform: capitalize;
            padding: 0 24px;
            box-sizing: border-box;
          }
        }
      }

      .tbody {
        .tr {
          display: flex;
          align-items: center;
          width: 726px;
          border-bottom: 1px solid #F2F3F7;
          border-radius: 8px;

          &:last-child {
            // border-bottom: none;
          }

          &:hover {
            background: #F0F2F6;
          }

          td {
            flex: 1;
            height: 64px;
            padding: 0 24px;
            box-sizing: border-box;
            color: #121318;
            font-family: 'Montserrat-Regular';
            font-size: 15px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
            letter-spacing: 0.6px;
            text-transform: capitalize;
            display: flex;
            align-items: center;

            img {
              width: 16px;
              height: auto;
              margin-right: 8px;
            }

            span {
              font-family: 'Montserrat-Medium';
              color: #0B8F6F;
              font-size: 13px;
              display: flex;
              padding: 4px 6px;
              align-items: center;
              border-radius: 4px;
              background: rgba(11, 143, 111, 0.12);
            }

            .join-btn {
              border-radius: 6px;
              border: 1px solid #121318;
              color: #121318;
              font-family: 'Montserrat-bold';
              font-size: 15px;
              font-style: normal;
              line-height: normal;
              letter-spacing: 0.3px;
              text-transform: capitalize;
              width: 66px;
              height: 34px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;

              &:hover {
                background: #121318;
                color: #FFF;
              }
            }
          }
        }
      }
    }
  }

  .r {
    width: 330px;
    margin-left: 24px;
    border-radius: 12px;
    background: #FED863;
    padding: 32px 24px;
    box-sizing: border-box;

    .title {
      color: #121318;
      font-family: Montserrat-bold;
      font-size: 18px;
      font-style: normal;
      line-height: normal;
      letter-spacing: 0.72px;
      text-transform: capitalize;
    }

    .select {
      margin-top: 8px;

      p {
        color: #121318;
        font-family: Montserrat-Regular;
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        letter-spacing: 0.56px;
        text-transform: capitalize;
        display: flex;
        align-items: flex-end;

        span {
          color: #121318;
          font-family: Montserrat-bold;
          font-size: 36px;
          font-style: italic;
          line-height: 36px;
          /* 100% */
          letter-spacing: 1.44px;
          margin-left: 8px;
        }
      }

      .options {
        margin-top: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        .options-item {
          border-radius: 8px;
          border: 2px solid rgba(48, 50, 53, 0.20);
          width: 133px;
          flex: 0 0 133px;
          height: 66px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #121318;
          font-family: Montserrat-bold;
          font-size: 15px;
          font-style: normal;
          line-height: normal;
          letter-spacing: 0.6px;
          text-transform: capitalize;
          cursor: pointer;

          &.options-item-a {
            border: 2px solid #121318;
            position: relative;

            &::after {
              content: '';
              position: absolute;
              right: 0;
              bottom: 0;
              width: 32px;
              height: 32px;
              background: url(../assets/images/select.svg) no-repeat;
              background-position: 0 0;
              background-size: 100% 100%;
            }
          }
        }
      }
    }

    .create-btn {
      margin-top: 24px;
      width: 100%;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      font-family: Montserrat-600;
      font-size: 18px;
      font-style: normal;
      line-height: normal;
      letter-spacing: 0.72px;
      text-transform: capitalize;
      border-radius: 8px;
      background: #121318;
      cursor: pointer;
    }
  }
}
</style>