<script setup>
import { ref, onBeforeUnmount, watch, toRaw} from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { execute } from '../libs/inject'
import { useGlobalStore } from '../hooks/globalStore'

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
  id = Number(id)
  console.log(id)
  loading.value = true
  let contract = toRaw(store.state.contract)
  try {
    const tx = await execute(contract, 'joinRoom', [id])
    console.log(tx)
    message.success('Join Room Success')
    // getRoomList()
    // router.push(`/room/${id}`)
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)
  }
  loading.value = false
}

const createRoom = async () => {
  createLoading.value = true
  let contract = toRaw(store.state.contract)
  try {
    const tx = await execute(contract, 'createRoom', [positionValue.value])
    isWaiting.value = true
    message.success('Create Room Success')
  } catch (error) {
    console.log(error)
    message.error(error.reason || error.data?.message || error.message || error)

  }
  createLoading.value = false
}

const getRoomList = async () => {
  loading.value = true
  let contract = toRaw(store.state.contract)
  console.log(contract)
  const res = await contract.getWaitingRoom()
  roomList.value = res.filter(e => e.gameState != 2)
  loading.value = false
  console.log(res)
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
}, {immediate: true})

onBeforeUnmount(() => {
  toRaw(store.state.contract).removeAllListeners('RoomCreated')
  toRaw(store.state.contract).removeAllListeners('GameStarted')
  toRaw(store.state.contract).removeAllListeners('GameEnded')
})
</script>
<template>
  <div class="home flex-start">
    <n-spin size="large" :show="loading" style="flex: 1; min-height: 400px;">
      <div class="l">
        <div class="title">Room List</div>
        <n-table :single-line="false" :loading="loading">
          <thead>
            <tr>
              <th>Room ID</th>
              <th>Players</th>
              <th>Position</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(room, index) in roomList" :key="index">
              <td>{{ room.roomId.toString() }}</td>
              <td>{{ getPlayers(room) }} / 2</td>
              <td>{{ room.currentPlayer == 1 ? 'black' : 'white' }}</td>
              <td>{{ room.gameState == 0 ? 'waiting' : room.gameState == 1 ? 'started' : room.gameState == 2 ? 'ended' :
                '' }}</td>
              <td>
                <n-button type="primary" size="small" v-if="isShowJoin(room)" @click="joinRoom(room.roomId)">Join</n-button>
                <n-button type="primary" size="small" v-if="room.gameState == 1 && (room.blackPlayer == store.state.aaAddress || room.whitePlayer == store.state.aaAddress)"
                  @click="toRoom(room.roomId)">Join</n-button>
              </td>
            </tr>
          </tbody>
        </n-table>
      </div>
    </n-spin>
    <n-spin size="large" :show="createLoading">
      <div v-if="!isWaiting" class="r">
        <div class="title">Create Room</div>
        <div class="img"></div>
        <div class="select">
          <p>Select Your Position, black first</p>
          <n-select placeholder="Select Your Position" style="width: 100%;" v-model:value="positionValue"
            :options="options" />
        </div>
        <n-button type="primary" style="width: 100%; margin-top: 24px;" @click="createRoom">Create</n-button>
      </div>
      <div v-else class="r">
        <div class="title">Waiting</div>
        <div class="img"></div>
        <div class="select">
          <p>Your roomId is {{ createRoomId }}</p>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped lang="scss">
.home {
  height: calc(100vh - 66px);
  padding: 24px;
  box-sizing: border-box;

  .title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 24px;
  }

  .l {
    flex: 1;
    border: 1px solid rgba(239, 239, 245, 1);
    border-radius: 4px;
    padding: 12px;
    box-sizing: border-box;
  }

  .r {
    width: 500px;
    margin-left: 24px;
    border: 1px solid rgba(239, 239, 245, 1);
    border-radius: 4px;
    padding: 12px;
    box-sizing: border-box;

    .img {
      width: 200px;
      height: 200px;
      background: #ccc;
    }

    .select {
      margin-top: 24px;

      p {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
      }
    }
  }
}</style>