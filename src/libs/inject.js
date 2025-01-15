import { ethers } from "ethers";

export async function init_wallet(rpc_url) {
  // arb-goerli rpc url
  // let rpc_url = "https://arbitrum-goerli.infura.io/v3/f2d8df49b1da46f49db541f7e66a74bb";
  return new Promise(async (resolve, reject) => {
    let pk = localStorage.getItem("pk");
    let privateKey;
    if (!pk) {
      const wallet = ethers.Wallet.createRandom();
      privateKey = wallet.privateKey;
      localStorage.setItem("pk", privateKey);
    } else {
      privateKey = pk
    }
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpc_url);
      const wallet = new ethers.Wallet(privateKey, provider);
      let address = wallet.address;
      console.log("当前EOA钱包地址是", address);
      let network = await provider.getNetwork();
      window.gomokuEthereum = {
        isMetaMask: true,
        isConnected: true,
        enable: async () => [address],
        network_version: network.chainId,
        selectedAddress: async () => {
          return address;
        },
        request: async ({ method, params }) => {
          if (method === "eth_accounts" || method === "eth_requestAccounts") {
            return [address];
          }
          if (method === "eth_signTransaction") {
            const [transaction] = params;
            return await window.signTransaction(transaction);
          }
          if (method === "eth_chainId") {
            return "0x" + parseInt(network.chainId).toString(16);
          }
          if (method === "eth_sendTransaction") {
            let a = await window.eth_sendTransaction(method, params);
            return a;
          }
          if (method === "wallet_switchEthereumChain") {
            const [switchParams] = params;
            console.log("页面跳转", params);
            return null;
          }
          let a = await window.provider(method, params);
          return a;
        },
        autoRefreshOnNetworkChange: false, // 设置为 false 以防止页面在网络更改时自动刷新
        on: () => { }, // 添加一个空的 on 方法以避免潜在的错误
        removeListener: () => { }, // 添加一个空的 removeListener 方法以避免潜在的错误
      };
      window.provider = async function (method, params) {
        return await provider.send(method, params);
      };
      window.eth_sendTransaction = async (method, params) => {
        const tx = params[0];
        let nonce = await wallet.getTransactionCount();
        let gasLimit = ethers.BigNumber.from(tx.gas).toNumber();
        let gasPrice = await provider.getGasPrice();
        let value = 0 || ethers.BigNumber.from(tx.value ? tx.value : 0);
        const transaction = {
          to: tx.to,
          data: tx.data,
          value: value,
          nonce: nonce,
          gasLimit: gasLimit,
          chainId: network.chainId,
          type: 0,
          gasPrice: gasPrice,
        };
        const signedTx = await wallet.signTransaction(transaction);
        let a = await provider.sendTransaction(signedTx);
        return a.hash;
      };
      resolve('success');
    } catch (error) {
      reject(error);
    }
  })
}

function generateRandomNumber(length) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function create_aa_wallet() {
  let web3 = new ethers.providers.Web3Provider(window.gomokuEthereum);
  let signer = web3.getSigner();
  let wallet_address = await signer.getAddress();
  const FactoryABI = [{ "inputs": [{ "internalType": "contract IEntryPoint", "name": "_entryPoint", "type": "address" }, { "internalType": "address", "name": "_GamerCardAddress", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "account", "type": "address" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "ownerId", "type": "uint256" }], "name": "AccountCreated", "type": "event" }, { "inputs": [], "name": "GamerCardAddress", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "accountCardId", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "accountImplementation", "outputs": [{ "internalType": "contract SimpleAccount", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "salt", "type": "uint256" }], "name": "createAccount", "outputs": [{ "internalType": "contract SimpleAccount", "name": "ret", "type": "address" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "salt", "type": "uint256" }, { "internalType": "uint256", "name": "ownerId", "type": "uint256" }], "name": "getAddress", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }]
  const FactoryAddress = "0xcf7656f99cbc7055BB51F8cD0210436a5C13c02B"
  const factory = new ethers.Contract(FactoryAddress, FactoryABI, signer);
  let salt = generateRandomNumber(9);
  salt = ethers.BigNumber.from(salt);
  let t = await factory.createAccount(wallet_address, salt);
  console.log(t)
  let tx = await t.wait();
  console.log(t)
  let token_id = tx.events?.filter((e) => e.event == "AccountCreated")[0].args.ownerId
  let aa_address = await factory.getAddress(wallet_address, salt, token_id);
  console.log("创建的aa钱包地址", aa_address, token_id)

  localStorage.setItem("aa_address", aa_address);
  return { id: token_id.toString(), address: aa_address }
}

export async function execute(contract, method_name, params) {
  let web3 = new ethers.providers.Web3Provider(window.gomokuEthereum);
  let signer = web3.getSigner();
  // let aa_address = localStorage.getItem("aa_address");
  // let aa_ABI = [{ "inputs": [{ "internalType": "contract IEntryPoint", "name": "anEntryPoint", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "previousAdmin", "type": "address" }, { "indexed": false, "internalType": "address", "name": "newAdmin", "type": "address" }], "name": "AdminChanged", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "beacon", "type": "address" }], "name": "BeaconUpgraded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint8", "name": "version", "type": "uint8" }], "name": "Initialized", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "contract IEntryPoint", "name": "entryPoint", "type": "address" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }], "name": "SimpleAccountInitialized", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "implementation", "type": "address" }], "name": "Upgraded", "type": "event" }, { "inputs": [], "name": "addDeposit", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "entryPoint", "outputs": [{ "internalType": "contract IEntryPoint", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "dest", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "bytes", "name": "func", "type": "bytes" }], "name": "execute", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address[]", "name": "dest", "type": "address[]" }, { "internalType": "uint256[]", "name": "value", "type": "uint256[]" }, { "internalType": "bytes[]", "name": "func", "type": "bytes[]" }], "name": "executeBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "getDeposit", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getNonce", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "anOwner", "type": "address" }], "name": "initialize", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256[]", "name": "", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "", "type": "uint256[]" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "name": "onERC1155BatchReceived", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "name": "onERC1155Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "name": "onERC721Received", "outputs": [{ "internalType": "bytes4", "name": "", "type": "bytes4" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "proxiableUUID", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "bytes", "name": "", "type": "bytes" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "name": "tokensReceived", "outputs": [], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newImplementation", "type": "address" }], "name": "upgradeTo", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newImplementation", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "upgradeToAndCall", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "nonce", "type": "uint256" }, { "internalType": "bytes", "name": "initCode", "type": "bytes" }, { "internalType": "bytes", "name": "callData", "type": "bytes" }, { "internalType": "uint256", "name": "callGasLimit", "type": "uint256" }, { "internalType": "uint256", "name": "verificationGasLimit", "type": "uint256" }, { "internalType": "uint256", "name": "preVerificationGas", "type": "uint256" }, { "internalType": "uint256", "name": "maxFeePerGas", "type": "uint256" }, { "internalType": "uint256", "name": "maxPriorityFeePerGas", "type": "uint256" }, { "internalType": "bytes", "name": "paymasterAndData", "type": "bytes" }, { "internalType": "bytes", "name": "signature", "type": "bytes" }], "internalType": "struct UserOperation", "name": "userOp", "type": "tuple" }, { "internalType": "bytes32", "name": "userOpHash", "type": "bytes32" }, { "internalType": "uint256", "name": "missingAccountFunds", "type": "uint256" }], "name": "validateUserOp", "outputs": [{ "internalType": "uint256", "name": "validationData", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address payable", "name": "withdrawAddress", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdrawDepositTo", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }]
  // let aa_contract = new ethers.Contract(aa_address, aa_ABI, signer);
  // const data = contract.interface.encodeFunctionData(method_name, params);
  // let target_contract_address = contract.address
  // console.log("执行合约", target_contract_address, method_name)
  let tx = await contract.connect(signer)[method_name](...params, { gasPrice: ethers.utils.parseUnits('55', 'gwei') });
  console.log("执行合约", tx)
  let w = await tx.wait();
  return Object.assign(w, tx);
}



