<script setup>
import { ref, onBeforeMount, onBeforeUnmount} from 'vue'
import { useRouter } from 'vue-router'
import { contract, wallet, contractAbi } from '../config/config'
import { useMessage } from 'naive-ui'
import { Alchemy, AlchemySubscription } from "alchemy-sdk"
import { ethers } from "ethers";


const message = useMessage()
const router = useRouter()
const roomList = ref([])
const loading = ref(false)
const createLoading = ref(false)
const positionValue = ref(1)
const options = [
  { label: 'black', value: 1 },
  { label: 'white', value: 2 },
]

const getAlchemy = () => {
  let settings = {
    apiKey: 'xQr0n2BqF1Hkkuw5_0YiEXeyQdSYoW1u',
    network: 'eth-goerli'
  }
  let alchemy = new Alchemy(settings)
  return alchemy
}

const alchemy = getAlchemy()


const joinRoom = async (id) => {
  id = Number(id)
  console.log(id)
  loading.value = true
  try {
    const tx = await contract.joinRoom(id)
    await tx.wait()
    message.success('Join Room Success')
    getRoomList()
    router.push(`/room/${id}`)
  } catch (error) {
    console.log(error)
    message.error(error)
  }
  loading.value = false
}

const createRoom = async () => {
  createLoading.value = true
  try {
    const tx = await contract.createRoom(positionValue.value)
    await tx.wait()
    message.success('Create Room Success')
  } catch (error) {
    message.error(error)
  }
  createLoading.value = false
}

const getRoomList = async () => {
  loading.value = true
  const res = await contract.getWaitingRoom()
  roomList.value = res
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
  if (room.gameState == 0 && room.blackPlayer != wallet.address && room.whitePlayer != wallet.address) {
    return true
  }
}

onBeforeMount(() => {
  getRoomList()
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
    console.log(functionName, args)
    if (functionName == 'createRoom') {
      getRoomList()
    } else if (functionName == 'joinRoom') {
      getRoomList()
    } else if (functionName == 'checkWin') {
      getRoomList()
    } else if (functionName == 'checkOverTime') {
      getRoomList()
    }
    // if (res.params.from == wallet.address) {
    //   message.success('Create Room Success')
    //   getRoomList()
    // }
  })
})
onBeforeUnmount(() => {
  alchemy.ws.off()
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
              </td>
            </tr>
          </tbody>
        </n-table>
      </div>
    </n-spin>
    <n-spin size="large" :show="createLoading">
      <div class="r">
        <div class="title">Create Room</div>
        <div class="img"></div>
        <div class="select">
          <p>Select Your Position, black first</p>
          <n-select placeholder="Select Your Position" style="width: 100%;" v-model:value="positionValue"
            :options="options" />
        </div>
        <n-button type="primary" style="width: 100%; margin-top: 24px;" @click="createRoom">Create</n-button>
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