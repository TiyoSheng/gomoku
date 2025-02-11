import { reactive } from "vue";

const store = reactive({
  state: {
    contract: null,
    wallet: null,
    aaAddress: null,
    address: null,
    nftContract: null,
    aaList: [],
    balance: 0,
    rpcUrl: ''
  },
});

const setAddress = async (address) => {
  store.state.address = address
};

const setAaAddress = async (aaAddress) => {
  store.state.aaAddress = aaAddress
};

const setContract = async (contract) => {
  store.state.contract = contract
};

const setWallet = async (wallet) => {
  store.state.wallet = wallet
};

const setAaList = async (aaList) => {
  store.state.aaList = aaList
};

const setBalance = async (balance) => {
  store.state.balance = balance
};

const setNftContract = async (nftContract) => {
  store.state.nftContract = nftContract
};

const setRpcUrl = async (rpcUrl) => {
  store.state.rpcUrl = rpcUrl
};

export const useGlobalStore = () => ({
  store,
  setBalance,
  setAddress,
  setAaAddress,
  setContract,
  setWallet,
  setAaList,
  setNftContract,
  setRpcUrl
});
