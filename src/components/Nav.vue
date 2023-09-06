<script setup>
import { ref, onBeforeMount, toRaw, watch, onBeforeUnmount } from 'vue'
import { ethers } from "ethers";
import { init_wallet, create_aa_wallet } from '../libs/inject'
import { useMessage } from 'naive-ui'
import makeBlockie from 'ethereum-blockies-base64';
import { useGlobalStore } from '../hooks/globalStore'
import { contractAbi, contractAddress } from '../config/config'

let interval = null

const { setAddress, setAaAddress, setContract, setAaList, setBalance } = useGlobalStore()
const message = useMessage()
const balance = ref(null)
const aaAddress = ref('')
const address = ref('')
const createLoading = ref(false)
const aaList = ref([])
const showDropdown = ref(false)

onBeforeUnmount(() => {
  interval && clearInterval(interval)
})

const formatAddress = (address) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatBalance = (balance) => {
  balance = ethers.utils.formatEther(balance)
  // 保留4位小数
  balance = Number(balance).toFixed(4)
  return balance
}

const changeAA = (item) => {
  setAaAddress(item)
  localStorage.setItem('aa_address', item)
  aaAddress.value = item
  showDropdown.value = false
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
  console.log(1)
  if (createLoading.value) return
  aaAddress.value = ''
  createLoading.value = true
  try {
    aaAddress.value = await create_aa_wallet()
  } catch (error) {
    console.log(error)
    message.error('创建AA钱包失败')
    return
  }
  createLoading.value = false
  setAaAddress(aaAddress.value)
  let aa_list = localStorage.getItem('aa_list') ? JSON.parse(localStorage.getItem('aa_list')) : []
  aa_list.push(aaAddress.value)
  localStorage.setItem('aa_list', JSON.stringify(aa_list))
  setAaList(aa_list)
  aaList.value = aa_list
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
  aaList.value = localStorage.getItem('aa_list') ? JSON.parse(localStorage.getItem('aa_list')) : []
  if (aaAddress.value && !aaList.value.includes(aaAddress.value)) {
    aaList.value.push(aaAddress.value)
    localStorage.setItem('aa_list', JSON.stringify(aaList.value))
  }
  balance.value = bal.toString()
  setBalance(balance.value)
  if (balance.value == 0) {
    interval = setInterval(async () => {
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
        <div class="address flex-center">
          <div class="address-type">EOA</div><span @click="copy(address)">{{ address }}</span>
        </div>
        <img src="../assets/images/arrow.svg" alt="" class="left-icon">
        <div class="hint flex-center"><img src="../assets/images/hint.svg" alt="">gas余额不足请充值</div>
      </div>
      <div v-if="balance > 0 && !aaAddress">
        <div class="create-btn" @click="createAaWallet" :style="{ cursor: createLoading ? 'not-allowed' : 'pointer' }">
          <!-- <span v-if="createLoading" class="loader"></span> -->
          <img v-if="createLoading" src="../assets/images/loading.svg" alt="">
          Creating AA wallet
        </div>
      </div>
      <div class="flex-center block" v-if="balance > 0 && aaAddress">
        <div class="blance">{{ formatBalance(balance) }} BNB</div>
        <div class="line"></div>
        <div class="address flex-center">
          <div class="address-type">AA</div><span @click="copy(aaAddress)">{{ formatAddress(aaAddress) }}</span>
          <svg @click="() => showDropdown = !showDropdown"
            :style="{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }" class="arrow"
            xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M14.25 6.75L9 12L3.75 6.75" stroke="#858D99" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
        <div class="mask" v-if="showDropdown" @click="() => showDropdown = false"></div>
        <div class="dropdown-w" :style="{ 'max-height': showDropdown ? '350px' : '0' }">
          <div class="dropdown">
            <div class="eoa flex-center-sb address">
              <div class="flex-center">
                <div class="address-type">EOA</div><span>{{ formatAddress(address) }}</span>
              </div>
              <svg @click="copy(address)" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"
                fill="none">
                <path
                  d="M9.75 15.75L3 15.75C2.58579 15.75 2.25 15.4142 2.25 15L2.25 5.25C2.25 4.83579 2.58579 4.5 3 4.5L7.18934 4.5C7.38825 4.5 7.57902 4.57902 7.71967 4.71967L10.2803 7.28033C10.421 7.42098 10.5 7.61175 10.5 7.81066V15C10.5 15.4142 10.1642 15.75 9.75 15.75Z"
                  stroke="#858D99" stroke-linecap="round" stroke-linejoin="round" />
                <path
                  d="M7.5 4.5L7.5 3C7.5 2.58579 7.83579 2.25 8.25 2.25L12.4393 2.25C12.6383 2.25 12.829 2.32902 12.9697 2.46967L15.5303 5.03033C15.671 5.17098 15.75 5.36175 15.75 5.56066V12.75C15.75 13.1642 15.4142 13.5 15 13.5L10.5 13.5"
                  stroke="#858D99" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M10.5 8.25L7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5L6.75 4.5" stroke="#858D99"
                  stroke-linecap="round" stroke-linejoin="round" />
                <path d="M15.75 6L12.75 6C12.3358 6 12 5.66421 12 5.25L12 2.25" stroke="#858D99" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </div>
            <div class="aa-list">
              <div v-for="item in aaList" :key="item" class="address aa flex-center-sb" @click="changeAA(item)">
                <div class="flex-center">
                  <div class="address-type">AA</div><span>{{ formatAddress(item) }}</span>
                  <svg v-if="false" class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 18 18" fill="none">
                    <path d="M3 15H15" stroke="#858D99" stroke-width="1.35" stroke-linecap="round"
                      stroke-linejoin="round" />
                    <path
                      d="M3 15H6L14.4697 6.53034C14.7626 6.23745 14.7626 5.76257 14.4697 5.46968L12.5303 3.53034C12.2374 3.23745 11.7626 3.23745 11.4697 3.53034L3 12V15Z"
                      stroke="#858D99" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <svg v-if="aaAddress == item" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 18 18" fill="none">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M13.7491 5.65717C14.042 5.95006 14.042 6.42494 13.7491 6.71783L8.12408 12.3428C7.83119 12.6357 7.35631 12.6357 7.06342 12.3428L4.25092 9.53033C3.95803 9.23744 3.95803 8.76256 4.25092 8.46967C4.54381 8.17678 5.01869 8.17678 5.31158 8.46967L7.59375 10.7518L12.6884 5.65717C12.9813 5.36428 13.4562 5.36428 13.7491 5.65717Z"
                    fill="white" />
                </svg>
              </div>
            </div>
            <div class="create-aa-btn" @click="createAaWallet">
              <div class="btn flex-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none">
                  <path d="M5.5 10H15.5" stroke="white" stroke-width="1.25" stroke-linecap="round"
                    stroke-linejoin="round" />
                  <path d="M10.5 15L10.5 5" stroke="white" stroke-width="1.25" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                Create AA wallet
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nav {
  height: 78px;
  padding: 0 24px;
  box-sizing: border-box;
  position: relative;
  z-index: 99;

  .logo {
    font-size: 28px;
    font-family: 'Montserrat';
    color: #fff;
    font-style: italic;
    text-transform: capitalize;
    cursor: pointer;
  }

  .wallet {
    border-radius: 10px;
    border: 1.5px solid rgba(133, 141, 153, 0.33);
    display: flex;
    align-items: center;
    position: relative;

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

      .arrow {
        margin-left: 8px;
        cursor: pointer;
        transition: all .3s;
        position: relative;
        z-index: 100;
        &:hover {
          path {
            stroke: #FFF;
          }
        }
      }

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
      cursor: pointer;
      background: rgba(133, 141, 153, 0.20);

      img {
        width: 20px;
        height: 20px;
        animation: mulShdSpin 1.6s infinite linear;
        margin-right: 8px;
      }
    }

    .mask {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 98;
    }

    .dropdown-w {
      position: absolute;
      top: 60px;
      right: 0;
      transition: all .3s;
      overflow: hidden;
      border-radius: 10px;
      z-index: 99;
      // max-height: 0;
    }

    .dropdown {
      width: 300px;
      border-radius: 10px;
      border: 1px solid rgba(133, 141, 153, 0.15);
      background: rgba(18, 19, 24, 1);
      box-shadow: 0px 12px 30px 0px rgba(10, 10, 12, 0.30);
      backdrop-filter: blur(10px);
      z-index: 99;

      .eoa {
        height: 52px;
        border-bottom: 1px solid #292B2F;
        background: #1F2128;
        padding: 0 14px;
        box-sizing: border-box;
        cursor: pointer;

        svg {
          cursor: pointer;

          &:hover {
            path {
              stroke: #FFF;
            }
          }
        }
      }

      .aa-list {
        max-height: 236px;
        overflow-y: auto;
      }

      .aa {
        height: 40px;
        padding: 0 14px;
        margin-top: 6px;
        box-sizing: border-box;
        cursor: pointer;

        &:hover {
          border-radius: 6px;
          background: #2D323B;
        }

        .edit-icon {
          margin-left: 6px;
          cursor: pointer;

          &:hover {
            path {
              stroke: #FFF;
            }
          }
        }
      }

      .create-aa-btn {
        background: rgba(18, 19, 24, 1);
        padding: 6px;
        box-sizing: border-box;

        .btn {
          border-radius: 6px;
          background: rgba(133, 141, 153, 0.20);
          display: flex;
          justify-content: center;
          align-items: center;
          color: #FFF;
          font-family: Montserrat-Medium;
          font-size: 15px;
          font-style: normal;
          line-height: normal;
          text-transform: capitalize;
          cursor: pointer;
          height: 40px;

          svg {
            margin-right: 6px;
          }
        }
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
}</style>