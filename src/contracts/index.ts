import { ethers } from "ethers";
import Contrats from "./10.json";
const rpc = "https://optimism.publicnode.com";
const provider = new ethers.providers.JsonRpcProvider(rpc)
const swapContract = new ethers.Contract(Contrats.swap.address, Contrats.swap.abi, provider);
const zeroAddress = ethers.constants.AddressZero;
const wbnbAddress = Contrats.wbnb;
const usdtAddress = Contrats.usdt;
const usdtContract = new ethers.Contract(Contrats.usdt, Contrats.erc20Abi, provider);
const ERC20ABI = Contrats.erc20Abi;

export {
    zeroAddress, provider, swapContract, wbnbAddress, usdtAddress, usdtContract, ERC20ABI
}