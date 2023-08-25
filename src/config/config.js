import { ethers } from "ethers";
const rpc_url = "https://goerli.infura.io/v3/d10c4ff706c546c485a8d9d92d1e5096";
const contract_address = "0x4f91f5Bce22879562FA10D83C0d5938bf0F5182a";
const contract_abi = '[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"roomId","type":"uint256"},{"indexed":false,"internalType":"address","name":"winner","type":"address"}],"name":"GameEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"roomId","type":"uint256"},{"indexed":false,"internalType":"address","name":"blackPlayer","type":"address"},{"indexed":false,"internalType":"address","name":"whitePlayer","type":"address"}],"name":"GameStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"roomId","type":"uint256"},{"indexed":false,"internalType":"enum Gomoku.Position","name":"position","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"x","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"y","type":"uint256"}],"name":"MoveMade","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"roomId","type":"uint256"},{"indexed":false,"internalType":"address","name":"player","type":"address"},{"indexed":false,"internalType":"enum Gomoku.Position","name":"position","type":"uint8"}],"name":"RoomCreated","type":"event"},{"inputs":[{"internalType":"uint256","name":"roomId","type":"uint256"}],"name":"checkOverTime","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"roomId","type":"uint256"},{"internalType":"uint256[][]","name":"list","type":"uint256[][]"}],"name":"checkWin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"enum Gomoku.Position","name":"position","type":"uint8"}],"name":"createRoom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"roomId","type":"uint256"}],"name":"getBoard","outputs":[{"internalType":"enum Gomoku.Position[15][15]","name":"","type":"uint8[15][15]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getWaitingRoom","outputs":[{"components":[{"internalType":"uint256","name":"roomId","type":"uint256"},{"internalType":"uint256","name":"lastMoveBlock","type":"uint256"},{"internalType":"address","name":"blackPlayer","type":"address"},{"internalType":"address","name":"whitePlayer","type":"address"},{"internalType":"enum Gomoku.Position","name":"currentPlayer","type":"uint8"},{"internalType":"uint8","name":"moveCount","type":"uint8"},{"internalType":"enum Gomoku.Position[15][15]","name":"board","type":"uint8[15][15]"},{"internalType":"enum Gomoku.GameState","name":"gameState","type":"uint8"},{"internalType":"address","name":"winner","type":"address"}],"internalType":"struct Gomoku.Room[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"roomId","type":"uint256"}],"name":"joinRoom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"roomId","type":"uint256"},{"internalType":"uint8","name":"x","type":"uint8"},{"internalType":"uint8","name":"y","type":"uint8"}],"name":"makeMove","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"nextRoomId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"players","outputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint16","name":"wins","type":"uint16"},{"internalType":"uint16","name":"losses","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"rooms","outputs":[{"internalType":"uint256","name":"roomId","type":"uint256"},{"internalType":"uint256","name":"lastMoveBlock","type":"uint256"},{"internalType":"address","name":"blackPlayer","type":"address"},{"internalType":"address","name":"whitePlayer","type":"address"},{"internalType":"enum Gomoku.Position","name":"currentPlayer","type":"uint8"},{"internalType":"uint8","name":"moveCount","type":"uint8"},{"internalType":"enum Gomoku.GameState","name":"gameState","type":"uint8"},{"internalType":"address","name":"winner","type":"address"}],"stateMutability":"view","type":"function"}]';
const privateKey = "9f0b7fda7aa3e9bb0e3f4c2859996bd2524610963f50953d5ad3c33b9bca30e0";
export const provider = new ethers.providers.JsonRpcProvider(rpc_url)
export const wallet = new ethers.Wallet(privateKey, provider);
export const contract = new ethers.Contract(contract_address, contract_abi, wallet);
export const contractAbi = contract_abi