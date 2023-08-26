import { reactive } from "vue";

const store = reactive({
  state: {
    contract: null,
    wallet: null,
    aaAddress: null,
    address: null,
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


export const useGlobalStore = () => ({
  store,
  setAddress,
  setAaAddress,
  setContract,
  setWallet
});
