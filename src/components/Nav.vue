<script setup>
import { ref, onBeforeMount, toRaw} from 'vue'
import { ethers } from "ethers";
import { init_wallet, create_aa_wallet } from '../libs/inject'
import { useMessage } from 'naive-ui'
import makeBlockie from 'ethereum-blockies-base64';
import { useGlobalStore } from '../hooks/globalStore'
import { contractAbi, contractAddress } from '../config/config'

const { setAddress, setAaAddress, setContract } = useGlobalStore()
const message = useMessage()
const balance = ref(null)
const aaAddress = ref('')
const address = ref('')
const createLoading = ref(false)

const formatAddress = (address) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatBalance = (balance) => {
  balance = ethers.utils.formatEther(balance)
  // 保留4位小数
  balance = Number(balance).toFixed(4)
  return balance
}

const copy = (value) => {
  const input = document.createElement('input')
  input.setAttribute('readonly', 'readonly')
  input.setAttribute('value', value)
  document.body.appendChild(input)
  input.select()
  input.setSelectionRange(0, 9999)
  if (document.execCommand('copy')) {
    document.execCommand('copy')
    console.log('复制成功')
    message.success('复制成功')
  }
  document.body.removeChild(input)
}

const createAaWallet = async () => {
  createLoading.value = true
  aaAddress.value = await create_aa_wallet()
  createLoading.value = false
  setAaAddress(aaAddress.value)
}

onBeforeMount(async () => {
  await init_wallet()
  let web3 = new ethers.providers.Web3Provider(window.ethereum);
  // 获取钱包地址
  let accounts = await web3.listAccounts();
  address.value = accounts[0]
  // 获取钱包余额
  let bal = await web3.getBalance(accounts[0]);
  balance.value = bal.toString()
  if (balance.value == 0) {
    let interval = setInterval(async () => {
      let bal = await web3.getBalance(accounts[0]);
      if (bal.toString() > 0) {
        clearInterval(interval)
        balance.value = bal.toString()
      }
    }, 10000)
  }
  aaAddress.value = localStorage.getItem('aa_address') || ''
  let signer = web3.getSigner();
  let contract = new ethers.Contract(contractAddress, contractAbi, signer);
  setContract(toRaw(contract))
  setAddress(address.value)
  setAaAddress(aaAddress.value)
  // wallet.value = await init_wallet()
  // if (!wallet.value) {
  //   wallet.value = await create_aa_wallet()
  // }
})
</script>

<template>
  <div class="nav flex-center-sb">
    <div class="logo">logo</div>
    <div class="wallet flex-center">
      <div v-if="address && balance && balance == 0">gas余额不足请充值: <span @click="copy(address)">{{ address }}</span></div>
      <div v-if="balance > 0 && !aaAddress">
        <n-spin size="small" :show="createLoading">
          <n-button type="primary" @click="createAaWallet">创建aa钱包</n-button>
        </n-spin>
      </div>
      <div class="flex-center" style="cursor: pointer;" v-if="balance > 0 && aaAddress" @click="copy(aaAddress)">
        AA Account: {{ formatAddress(aaAddress) }} <label style="margin-left: 12px;">{{ formatBalance(balance) }} BNB</label>
        <img :src="makeBlockie(aaAddress)" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nav {
  height: 66px;
  padding: 0 24px;
  box-sizing: border-box;
  border-bottom: 1px solid #E5E5E5;
  .logo {
    font-size: 32px;
    font-weight: 500;
  }
  .wallet {
    font-size: 14px;
    span  {
      color: #1684fc;
      cursor: pointer;
    }
    img {
      width: 32px;
      height: 32px;
      margin-left: 12px;
      border-radius: 16px;
    }
  }
}
</style>
