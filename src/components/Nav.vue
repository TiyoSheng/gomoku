<script setup>
import { ref, onBeforeMount, toRaw, watch} from 'vue'
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
const createLoading = ref(true)

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
  if (createLoading) return
  createLoading.value = true
  aaAddress.value = await create_aa_wallet()
  createLoading.value = false
  setAaAddress(aaAddress.value)
}

const toIndex = () => {
  window.location.href = '/'
}

onBeforeMount(async () => {
  await init_wallet()
  console.log(window.ethereum)
  let web3 = new ethers.providers.Web3Provider(window.ethereum);
  // 获取钱包地址
  let accounts = await web3.listAccounts();
  address.value = accounts[0]
  // 获取钱包余额
  let bal = await web3.getBalance(accounts[0]);
  aaAddress.value = localStorage.getItem('aa_address') || ''
  balance.value = bal.toString()
  if (balance.value == 0) {
    let interval = setInterval(async () => {
      let bal = await web3.getBalance(accounts[0]);
      if (bal.toString() > 0) {
        clearInterval(interval)
        balance.value = bal.toString()
        if (!aaAddress.value) {
          await createAaWallet()
        }
      }
    }, 10000)
  } else if (balance.value && !aaAddress.value) {
    await createAaWallet()
  }
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
    <div class="logo" @click="toIndex">Gomoku</div>
    <div class="wallet">
      <div v-if="address && balance && balance == 0" class="flex-center block">
        <div class="blance">0.0 BNB</div>
        <div class="line"></div>
        <div class="address flex-center"><div class="address-type">EOA</div><span @click="copy(address)">{{ formatAddress(address) }}</span></div>
        <img src="../assets/images/arrow.svg" alt="" class="left-icon">
        <div class="hint flex-center"><img src="../assets/images/hint.svg" alt="">gas余额不足请充值</div>
      </div>
      <div v-if="balance > 0 && !aaAddress">
        <div class="create-btn" @click="createAaWallet">
          <!-- <span v-if="createLoading" class="loader"></span> -->
          <img v-if="createLoading" src="../assets/images/loading.svg" alt="">
          Creating AA wallet
        </div>
      </div>
      <div class="flex-center block" v-if="balance > 0 && aaAddress">
        <div class="blance">{{ formatBalance(balance) }} BNB</div>
        <div class="line"></div>
        <div class="address flex-center"><div class="address-type">AA</div><span @click="copy(aaAddress)">{{ formatAddress(aaAddress) }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nav {
  height: 78px;
  padding: 0 24px;
  box-sizing: border-box;
  .logo {
    font-size: 28px;
    font-family: 'Montserrat';
    color: #fff;
    font-style: italic;
    text-transform: capitalize;
  }
  .wallet {
    border-radius: 10px;
    border: 1.5px solid rgba(133, 141, 153, 0.33);
    display: flex;
    align-items: center;
    overflow: hidden;
    .block {
      height: 44px;
      padding: 0 16px;
      box-sizing: border-box;
    }
    .blance {
      color: var(--ffffff, #FFF);
      font-family: Montserrat-Medium;
      font-size: 14px;
      font-style: normal;
      font-weight: 500;
    }
    .line {
      width: 1px;
      height: 12px;
      background: #FFF;
      opacity: 0.2;
      margin: 0 12px;
    }
    .address {
      color: var(--ffffff, #FFF);
      font-family: Montserrat-Medium;
      font-size: 14px;
      font-style: normal;
      .address-type {
        display: flex;
        padding: 4px 6px;
        align-items: center;
        border-radius: 4px;
        background: rgba(157, 255, 133, 0.12);
        color: #9DFF85;
        font-size: 13px;
        letter-spacing: 0.26px;
        text-transform: capitalize;
        margin-right: 6px;
      }
      span {
        cursor: pointer;
      }
    }
    .left-icon {
      margin: 0 8px;
      width: 24px;
      height: 24px;
    }
    .hint {
      border-radius: 6px;
      background: linear-gradient(95deg, #FFF0C0 -19.65%, #FED863 132.44%);
      height: 34px;
      color: #121318;
      font-family: Montserrat-Medium;
      font-size: 13px;
      font-style: normal;
      line-height: normal;
      letter-spacing: 0.26px;
      text-transform: capitalize;
      padding: 0 8px;
      box-sizing: border-box;
      img {
        width: 14px;
        height: 14px;
        margin-right: 6px;
      }
    }
    .create-btn {
      color: #FFF;
      font-family: Montserrat-Medium;
      font-size: 15px;
      font-style: normal;
      line-height: normal;
      text-transform: capitalize;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 205px;
      height: 44px;
      background: rgba(133, 141, 153, 0.20);
      img {
        width: 20px;
        height: 20px;
        animation: mulShdSpin 1.6s infinite linear;
        margin-right: 8px;
      }
    }
  }
}
@keyframes mulShdSpin {
  // 旋转
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>