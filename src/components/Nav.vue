<script setup>
import { ref, onBeforeMount, toRaw, watch, onBeforeUnmount } from 'vue'
import { ethers } from "ethers";
import { init_wallet, create_aa_wallet } from '../libs/inject'
import { useMessage } from 'naive-ui'
import { useGlobalStore } from '../hooks/globalStore'
import { contractAbi, contractAddress, nftAddress, nftAbi, rpcs } from '../config/config'

let interval = null

const { store, setAddress, setAaAddress, setContract, setAaList, setBalance, setNftContract } = useGlobalStore()
const message = useMessage()
const balance = ref(null)
const aaAddress = ref('')
const address = ref('')
const createLoading = ref(false)
const isGetBnb = ref(false)
const aaList = ref([])
const aaRemark = ref({})
const showDropdown = ref(false)
const showRpcDropdown = ref(false)
const editLoading = ref(false)
const editAA = ref('')
const remark = ref('')
const editAddress = ref('')
const rpcList = ref([])
const rpcUrl = ref('')
const changeRpcLoading = ref(false)


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

const bindRemark = () => {
  if (!remark.value) {
    message.error('请输入备注')
    return
  }
  let aa_remark = localStorage.getItem('aa_remark') ? JSON.parse(localStorage.getItem('aa_remark')) : {}
  aa_remark[editAA.value] = remark.value
  localStorage.setItem('aa_remark', JSON.stringify(aa_remark))
  aaRemark.value = aa_remark
  closeModal()
}

const bindTransfer = async () => {
  if (!editAddress.value || editAddress.value.length != 42) {
    message.error('请输入正确的地址')
    return
  }
  if (!store.state.nftContract) {
    message.error('请先连接钱包')
    return
  }
  try {
    editLoading.value = true
    console.log(toRaw(store.state.nftContract))
    let aa_list = localStorage.getItem('aa_list') ? JSON.parse(localStorage.getItem('aa_list')) : []
    let index = aa_list.findIndex(item => item.address == editAA.value)
    let tokenId = aa_list[index].id
    try {
      let tx = await toRaw(store.state.nftContract).transferFrom(address.value, editAddress.value, tokenId)
      let receipt = await tx.wait()
      console.log(receipt)
      message.success('转让成功')
      aa_list.splice(index, 1)
      localStorage.setItem('aa_list', JSON.stringify(aa_list))
      aaList.value = aa_list.map(e => e.address)
      if (aaAddress.value == editAA.value) {
        aaAddress.value = aaList.value[0] || ''
        localStorage.setItem('aa_address', aaAddress.value)
        setAaAddress(aaAddress.value)
      }
    } catch (error) {
      console.log(error)
      message.error('转让失败')
    }
    editLoading.value = false
    closeModal()
  } catch (error) {
    console.log(error)
    editLoading.value = false
    message.error('转让失败')
  }

}

const closeModal = () => {
  editAA.value = ''
  remark.value = ''
  editAddress.value = ''
}

const changeAA = (item) => {
  setAaAddress(item)
  localStorage.setItem('aa_address', item)
  aaAddress.value = item
  showDropdown.value = false
}

const changeRpc = async (item) => {
  rpcUrl.value = item.url
  changeRpcLoading.value = true
  await init()
  changeRpcLoading.value = false
  showRpcDropdown.value = false
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
  let obj = {}
  try {
    obj = await create_aa_wallet()
    aaAddress.value = obj.address
  } catch (error) {
    console.log(error)
    message.error('创建AA钱包失败')
    return
  }
  createLoading.value = false
  setAaAddress(aaAddress.value)
  let aa_list = localStorage.getItem('aa_list') ? JSON.parse(localStorage.getItem('aa_list')) : []
  aa_list.push(obj)
  localStorage.setItem('aa_list', JSON.stringify(aa_list))
  setAaList(aa_list)
  aaList.value = aa_list.map(e => e.address)
}

const getBnb = async () => {
  let isGeted = localStorage.getItem('isGeted') || ''
  if (isGeted) {
    message.error('已经领取过了')
    return
  }
  if (balance.value) return
  isGetBnb.value = true
  fetch('https://api.gomoku3.xyz/facuet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "address": address.value,
      "chain": 'arb_goerli'
    })
  }).then(res => res.json()).then(res => {
    console.log(res)
    if (res.code == 0) {
      message.success('获取成功')
    } else {
      message.error(res.msg)
    }
    isGetBnb.value = false
    localStorage.setItem('isGeted', 'true')
  }).catch(err => {
    console.log(err)
    isGetBnb.value = false
  })
}

const toIndex = () => {
  window.location.href = '/'
}

const init = async () => {
  interval && clearInterval(interval)
  try {
    await init_wallet(rpcUrl.value)
  } catch (error) {
    console.log(error)
    message.error(error.message || '连接钱包失败')
  }

  let web3 = new ethers.providers.Web3Provider(window.ethereum);
  // 获取钱包地址
  let accounts = await web3.listAccounts();
  address.value = accounts[0]
  // 获取钱包余额
  let bal = 0
  try {
    bal = await web3.getBalance(accounts[0]);
  } catch (error) {
    console.log(error)
    message.error(error.message || '获取账户余额失败')
  }
  // aaAddress.value = localStorage.getItem('aa_address') || ''
  aaAddress.value = address.value || ''
  // balance.value = bal.toString()
  balance.value = '1'
  console.log(balance.value)
  setBalance(balance.value)
  if (balance.value == 0) {
    interval = setInterval(async () => {
      let bal1 = 0
      try {
        bal1 = await web3.getBalance(accounts[0]);
      } catch (error) {
        console.log(error)
      }
      if (bal1.toString() > 0) {
        clearInterval(interval)
        balance.value = bal1.toString()
        setBalance(balance.value)
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
  let nftContract = new ethers.Contract(nftAddress, nftAbi, signer);
  setContract(toRaw(contract))
  setNftContract(toRaw(nftContract))
  setAddress(address.value)
  setAaAddress(aaAddress.value)

  const FactoryABI = [{ "inputs": [{ "internalType": "contract IEntryPoint", "name": "_entryPoint", "type": "address" }, { "internalType": "address", "name": "_GamerCardAddress", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "ownerId", "type": "uint256" }], "name": "AccountCreated", "type": "event" }, { "inputs": [], "name": "GamerCardAddress", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "accountCardId", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "accountImplementation", "outputs": [{ "internalType": "contract SimpleAccount", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "salt", "type": "uint256" }], "name": "createAccount", "outputs": [{ "internalType": "contract SimpleAccount", "name": "ret", "type": "address" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "salt", "type": "uint256" }, { "internalType": "uint256", "name": "ownerId", "type": "uint256" }], "name": "getAddress", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }]
  const FactoryAddress = "0x8DA48cCfa815E8C911e30677A3ad810889C1fB99"
  const factory = new ethers.Contract(FactoryAddress, FactoryABI, signer);
  // let aa_list = localStorage.getItem('aa_list') ? JSON.parse(localStorage.getItem('aa_list')) : []
  // aaList.value = aa_list.map(e => e.address)
  aaList.value = [aaAddress.value]
  // aaRemark.value = localStorage.getItem('aa_remark') ? JSON.parse(localStorage.getItem('aa_remark')) : {}
  // let nfts = await nftContract.getNftId(address.value)
  // let ids = aa_list.map(e => e.id)
  // // 获取不同的值
  // let diff = nfts.filter(e => !ids.includes(e.toString()))
  // if (diff.length) {
  //   diff.forEach(async e => {
  //     let address = await factory.accountCardId(e)
  //     let item = {
  //       id: e.toString(),
  //       address: address
  //     }
  //     aa_list.push(item)
  //     aaList.value.push(address)
  //     localStorage.setItem('aa_list', JSON.stringify(aa_list))
  //   })
  // }
}

const getRpcConnectivity = async (rpc) => {
  let startTime = new Date().getTime()
  let provider = new ethers.providers.JsonRpcProvider(rpc)
  await provider.getBlockNumber()
  let endTime = new Date().getTime()
  let time = endTime - startTime
  return time
}


onBeforeMount(async () => {
  // overwriteNonceZero()
  let rpcUrls = rpcs['20143']
  rpcUrl.value = rpcUrls[0]
  init()

  rpcUrls.forEach(async e => {
    let time = await getRpcConnectivity(e)
    let item = { url: e, time: (time / 1000).toFixed(2) }
    rpcList.value.push(item)
  })
})

watch(() => editAA.value, (val) => {
  if (val) {
    remark.value = aaRemark.value[val] || ''
  }
})

</script>

<template>
  <div class="nav flex-center-sb">
    <div class="logo" @click="toIndex">Gomoku</div>
    <div class="flex-center">
      <div class="rpc">
        <div class="flex-center" @click="() => showRpcDropdown = !showRpcDropdown">
          <div class="rpc-name">{{ rpcUrl }}</div>
          <svg :style="{ transform: showRpcDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }" class="arrow"
            xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M14.25 6.75L9 12L3.75 6.75" stroke="#858D99" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
        <div class="mask" v-if="showRpcDropdown" @click="() => showRpcDropdown = false"></div>
        <div class="dropdown-w" :style="{ 'max-height': showRpcDropdown ? '350px' : '0' }">
          <div class="dropdown">
            <n-spin :show="changeRpcLoading" size="small">
              <div class="rpc-list">
                <div v-for="item in rpcList" :key="item" class="rpc-item flex-center-sb" @click="changeRpc(item)">
                  <n-popover trigger="hover" :show-arrow="false" style="padding: 0;background: #48484e;">
                    <template #trigger>
                      <div class="rpc-name">{{ item.url }}</div>
                    </template>
                    <span class="popover-span">{{ item.url }}</span>
                  </n-popover>
                  <div class="flex-center" style="flex: 0 0 60px;justify-content: flex-end;">
                    <svg v-if="rpcUrl == item.url" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                      viewBox="0 0 18 18" fill="none">
                      <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M13.7491 5.65717C14.042 5.95006 14.042 6.42494 13.7491 6.71783L8.12408 12.3428C7.83119 12.6357 7.35631 12.6357 7.06342 12.3428L4.25092 9.53033C3.95803 9.23744 3.95803 8.76256 4.25092 8.46967C4.54381 8.17678 5.01869 8.17678 5.31158 8.46967L7.59375 10.7518L12.6884 5.65717C12.9813 5.36428 13.4562 5.36428 13.7491 5.65717Z"
                        fill="white" />
                    </svg>
                    <span class="rpc-time">{{ item.time }}s</span>
                  </div>

                </div>
              </div>
            </n-spin>
          </div>
        </div>
      </div>
      <div class="wallet">
        <div v-if="address && balance && balance == 0" class="flex-center block">
          <!-- <div class="flex-center block"> -->
          <div class="blance">0.0 DMON</div>
          <div class="line"></div>
          <div class="address flex-center">
            <div class="address-type">EOA</div><span @click="copy(address)">{{ address }}</span>
          </div>
          <img src="../assets/images/arrow.svg" alt="" class="left-icon">
          <div class="hint flex-center"><img src="../assets/images/hint.svg" alt="">Gas余额不足请充值</div>
          <!-- <n-spin :show="isGetBnb" size="small">
            <div class="hint pointer flex-center" @click="getBnb">点击获取测试ETH</div>
          </n-spin> -->
          <div class="popover">请向此地址充值DMON,不是Metamask</div>
        </div>
        <div v-if="balance > 0 && !aaAddress">
          <div class="create-btn" @click="createAaWallet"
            :style="{ cursor: createLoading ? 'not-allowed' : 'pointer' }">
            <!-- <span v-if="createLoading" class="loader"></span> -->
            <img v-if="createLoading" src="../assets/images/loading.svg" alt="">
            Creating AA wallet
          </div>
        </div>
        <div class="flex-center block" v-if="balance > 0 && aaAddress">
          <!-- <div class="flex-center block" v-if="false"> -->
          <div class="blance">{{ formatBalance(balance) }} ETH</div>
          <div class="line"></div>
          <div class="address flex-center">
            <div class="address-type">AA</div><span v-if="aaRemark[aaAddress]">{{ aaRemark[aaAddress] }}</span><span
              @click="copy(aaAddress)">{{ formatAddress(aaAddress) }}</span>
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
                <svg @click="copy(address)" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9.75 15.75L3 15.75C2.58579 15.75 2.25 15.4142 2.25 15L2.25 5.25C2.25 4.83579 2.58579 4.5 3 4.5L7.18934 4.5C7.38825 4.5 7.57902 4.57902 7.71967 4.71967L10.2803 7.28033C10.421 7.42098 10.5 7.61175 10.5 7.81066V15C10.5 15.4142 10.1642 15.75 9.75 15.75Z"
                    stroke="#858D99" stroke-linecap="round" stroke-linejoin="round" />
                  <path
                    d="M7.5 4.5L7.5 3C7.5 2.58579 7.83579 2.25 8.25 2.25L12.4393 2.25C12.6383 2.25 12.829 2.32902 12.9697 2.46967L15.5303 5.03033C15.671 5.17098 15.75 5.36175 15.75 5.56066V12.75C15.75 13.1642 15.4142 13.5 15 13.5L10.5 13.5"
                    stroke="#858D99" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M10.5 8.25L7.5 8.25C7.08579 8.25 6.75 7.91421 6.75 7.5L6.75 4.5" stroke="#858D99"
                    stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M15.75 6L12.75 6C12.3358 6 12 5.66421 12 5.25L12 2.25" stroke="#858D99"
                    stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="aa-list">
                <div v-for="item in aaList" :key="item" class="address aa flex-center-sb" @click="changeAA(item)">
                  <div class="flex-center">
                    <div class="address-type">AA</div><span v-if="aaRemark[item]">{{ aaRemark[item] }}</span><span>{{
                      formatAddress(item) }}</span>
                    <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"
                      fill="none" @click.stop="() => editAA = item">
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
    <div v-if="editAA" class="edit-modal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <n-spin :show="editLoading" size="small">
          <img src="../assets/images/close.svg" alt="" class="close" @click="closeModal">
          <div class="hd flex-center">
            <div class="title">Set Up</div>
            <div class="type flex-center-center">AA</div>
            <div class="address">{{ formatAddress(editAA) }}</div>
          </div>
          <div class="bd">
            <div class="item">
              <div class="item-title">Remarks</div>
              <div class="item-input flex-center">
                <input type="text" placeholder="Enter a comment name" v-model="remark" />
                <div :class="['item-btn', 'flex-center-center', remark ? 'item-btn-activate' : '']" @click="bindRemark">
                  Save</div>
              </div>
            </div>
            <div class="item">
              <div class="item-title">Transfer</div>
              <div class="item-input flex-center">
                <input type="text" placeholder="Enter a different EOA address" v-model="editAddress" />
                <div
                  :class="['item-btn', 'flex-center-center', editAddress && editAddress.length == 42 ? 'item-btn-activate' : '']"
                  @click="bindTransfer">confirm</div>
              </div>
            </div>
          </div>
        </n-spin>
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

  .rpc {
    border-radius: 10px;
    border: 1.5px solid rgba(133, 141, 153, 0.33);
    display: flex;
    align-items: center;
    position: relative;
    height: 44px;
    padding: 0 16px;
    box-sizing: border-box;

    .rpc-name {
      color: var(--ffffff, #FFF);
      font-family: Montserrat-Medium;
      font-size: 14px;
      font-style: normal;
      width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #fff;
      height: 100%;
      line-height: 40px;
    }

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

    .rpc-list {
      max-height: 236px;
      overflow-y: auto;
      padding: 0 6px;
      box-sizing: border-box;

      .rpc-item {
        height: 40px;
        padding: 0 14px;
        margin-top: 6px;
        box-sizing: border-box;
        cursor: pointer;

        &:hover {
          border-radius: 6px;
          background: #2D323B;
        }

        .rpc-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #fff;
          height: 100%;
          line-height: 40px;
        }

        .rpc-time {
          font-size: 12px;
          color: #fff;
          margin-left: 8px;
          color: #80d46b;
        }
      }
    }
  }

  .wallet {
    border-radius: 10px;
    border: 1.5px solid rgba(133, 141, 153, 0.33);
    display: flex;
    align-items: center;
    position: relative;
    margin-left: 24px;

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
      }

      span {
        cursor: pointer;
        margin-left: 6px;
      }
    }

    .left-icon {
      margin: 0 0 0 8px;
      width: 24px;
      height: 24px;
    }

    .hint {
      margin-left: 8px;
      border-radius: 6px;
      background: linear-gradient(95deg, #FFF0C0 -19.65%, #FED863 132.44%);
      height: 34px;
      color: #121318;
      font-family: Montserrat-Medium;
      font-size: 13px;
      font-style: normal;
      line-height: normal;
      letter-spacing: 0.26px;
      // text-transform: capitalize;
      padding: 0 8px;
      box-sizing: border-box;

      &.pointer {
        cursor: pointer;
      }

      img {
        width: 14px;
        height: 14px;
        margin-right: 6px;
      }
    }

    .popover {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 16px;
      box-sizing: border-box;
      border-radius: 10px;
      background: linear-gradient(95deg, #FFF0C0 -19.65%, #FED863 132.44%);
      color: #121318;
      font-family: Montserrat-Medium;
      font-size: 13px;
      font-style: normal;
      line-height: normal;
      letter-spacing: 0.26px;
      text-transform: capitalize;

      &::before {
        content: "";
        width: 0px;
        height: 0px;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid #FFF0C0;
        position: absolute;
        top: -8px;
        left: 65px;
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
        padding: 0 6px;
        box-sizing: border-box;
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

          .edit-icon {
            display: block;
          }
        }

        .edit-icon {
          margin-left: 6px;
          cursor: pointer;
          display: none;

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

.edit-modal {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  backdrop-filter: blur(2px);
  background: rgba(0, 0, 0, 0.1);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  .modal-content {
    width: 480px;
    // height: 259px;
    border-radius: 10px;
    background: #121318;
    padding: 20px;
    box-sizing: border-box;
    position: relative;

    .close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 16px;
      height: auto;
      cursor: pointer;
    }

    .hd {
      .title {
        color: #FFF;
        font-size: 20px;
        font-style: normal;
        font-weight: 600;
        line-height: normal;
        text-transform: capitalize;
      }

      .type {
        margin-left: 16px;
        width: 32px;
        height: 24px;
        border-radius: 4px;
        background: rgba(254, 216, 99, 0.12);
        color: #FED863;
        font-family: Montserrat-Medium;
        font-size: 13px;
        font-style: normal;
        line-height: normal;
        letter-spacing: 0.26px;
        text-transform: capitalize;
      }

      .address {
        margin-left: 6px;
        color: #FFF;
        font-family: Montserrat-Medium;
        font-size: 14px;
        font-style: normal;
        line-height: 18px;
        /* 128.571% */
      }
    }

    .bd {
      .item {
        margin-top: 24px;

        .item-title {
          color: var(--ffffff, #FFF);
          font-family: Montserrat-Regular;
          font-size: 14px;
          font-style: normal;
          line-height: normal;
          text-transform: capitalize;
        }

        .item-input {
          margin-top: 12px;

          input {
            padding: 0 18px;
            box-sizing: border-box;
            height: 40px;
            flex: 1;
            margin-right: 12px;
            border-radius: 8px;
            border: 1px solid rgba(133, 141, 153, 0.15);
            background: #0A0A0C;
            color: #FFF;
            font-family: Montserrat-Regular;
            font-size: 14px;
            font-style: normal;
            font-weight: 400;
            line-height: 20px;
            /* 142.857% */
            outline: none;

            &::placeholder {
              color: #858D99;
              font-family: Montserrat-Regular;
              font-size: 14px;
              font-style: normal;
              font-weight: 400;
              line-height: 20px;
              /* 142.857% */
              text-transform: capitalize;
            }
          }

          .item-btn {
            border-radius: 8px;
            border: 1px solid rgba(133, 141, 153, 0.15);
            background: #1A1B1D;
            flex: 0 0 82px;
            height: 40px;
            color: #858D99;
            font-family: Montserrat-Regular;
            font-size: 14px;
            font-style: normal;
            font-weight: 400;
            line-height: 20px;
            /* 142.857% */
            text-transform: capitalize;
            cursor: pointer;

            &-activate {
              border-radius: 8px;
              border: 1px solid rgba(133, 141, 153, 0.15);
              background: #3760D7;
              color: #FFF;
            }
          }
        }
      }
    }
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

<style>
.popover-span {
  background: #48484e;
  height: 32px;
  line-height: 32px;
  color: #fff;
  padding: 0 12px;
  border-radius: 2px;
}
</style>