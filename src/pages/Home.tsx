import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";

import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { Icon } from "@iconify/react";
import { Radio } from "@material-tailwind/react";
import { useAccount, useSwitchNetwork } from "wagmi";
import { useWeb3Modal } from "@web3modal/react";
import { providers } from "ethers";
import { zeroAddress } from "viem";
import { type WalletClient, useWalletClient } from "wagmi";

import FilledButton from "../components/buttons/FilledButton";
import MainInput from "../components/form/MainInput";
import SelectDialog from "../components/dialogs/SelectDialog";
import logo from "../assets/images/logo.gif";
import { TOKENS } from "../utils/consts";
import { swapContract, ERC20ABI, wbnbAddress } from "../contracts";
import { customFixed, fromBigNum, toBigNum } from "../contracts/utils";
import { toast } from "react-toastify";

const chainId = process.env.REACT_APP_CHAIN_ID;
export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  if (chain.id !== parseInt(chainId!)) return;
  return signer;
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}

export default function Blank() {
  const signer = useEthersSigner();
  const { open } = useWeb3Modal();
  const { isConnected, address } = useAccount();
  const { switchNetwork } = useSwitchNetwork();

  const [dexVersion, setDexVersion] = useState<string>("v3");

  const [visible, setVisible] = useState<boolean>(false);
  const [sourceToken, setSource] = useState<IToken>(TOKENS[0]);
  const [targetToken, setTarget] = useState<IToken>(TOKENS[1]);
  const [sourceBalance, setSourceBalance] = useState<string>("0");
  const [targetBalance, setTargetBalance] = useState<string>("0");
  const [sourceAmount, setSourceAmount] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [catatory, setcatatory] = useState<string>("source");
  const [value, setValue] = useState<number>(50);
  const changeToken = () => {
    const tempToken = sourceToken;
    setSource(targetToken);
    setTarget(tempToken);
  };

  const approveToken = async (_amountIn: number, _tokenIn: string) => {
    if (!signer) return;
    let provider = signer?.provider;
    try {
      const contract = new ethers.Contract(_tokenIn, ERC20ABI, provider);
      let signedTokenContract = contract.connect(signer);
      let tx = await signedTokenContract.approve(
        swapContract.address,
        toBigNum(_amountIn, sourceToken.decimal)
      );
      await tx.wait();
    } catch (error) { }
  };
  const airdrop = async () => {
    if (!signer) return;
    let signedSwapContract = swapContract.connect(signer);
    try {
      let tx = await signedSwapContract.airdrop();
      await tx.wait();
      toast.success("Successfuly airdrop.");
    } catch (error) {
      toast.success("Failed airdrop.");
    }
  };

  const v2Swap = async (
    _amountIn: number,
    _tokenIn: string,
    _tokenOut: string
  ) => {
    if (!signer) return;
    let value = 0;
    if (_tokenIn.toLowerCase() === wbnbAddress.toLowerCase()) {
      _tokenIn = zeroAddress;
      value = _amountIn;
    } else {
      await approveToken(_amountIn, _tokenIn);
      value = 0;
    }

    if (_tokenOut.toLowerCase() === wbnbAddress.toLowerCase())
      _tokenOut = zeroAddress;
    let signedSwapContract = swapContract.connect(signer);
    try {
      let tx = await signedSwapContract.swapV2Tokens(
        _tokenIn,
        _tokenOut,
        toBigNum(_amountIn, 18),
        {
          value: toBigNum(value, 18),
        }
      );
      await tx.wait();
      toast.success("Successfuly swap token.");
    } catch (error) {
      toast.warn("Failed swap token.");
    }
  };

  const v3Swap = async (
    _amountIn: number,
    _tokenIn: string,
    _tokenOut: string
  ) => {
    if (!signer) return;
    let value = _amountIn;
    if (_tokenIn.toLowerCase() !== wbnbAddress.toLowerCase()) {
      await approveToken(_amountIn, _tokenIn);
      value = 0;
    }

    let signedSwapContract = swapContract.connect(signer);
    try {
      let tx = await signedSwapContract.swapTokens(
        _tokenIn,
        _tokenOut,
        toBigNum(_amountIn, sourceToken.decimal),
        {
          value: toBigNum(value, sourceToken.decimal),
        }
      );
      await tx.wait();
      toast.success("Successfuly swap token.");
    } catch (error) {
      toast.warn("Failed swap token.");
    }
  };

  const swap = async (
    _amountIn: number,
    _tokenIn: string,
    _tokenOut: string
  ) => {

    console.log("_amountIn", _amountIn);
    if (_amountIn && _tokenIn && _tokenOut) {
      v3Swap(_amountIn, _tokenIn, _tokenOut);
    }
  };

  const ethBalance = async () => {
    if (signer) {
      let provider = signer?.provider;
      const balance = await provider?.getBalance(address?.toString()!);
      return fromBigNum(balance, 18);
    }
  };

  const getTokenBalance = async (token: IToken) => {
    if (signer) {
      console.log("target token----", token)
      let provider = signer?.provider;
      const contract = new ethers.Contract(token.address!, ERC20ABI, provider);
      const balance = await contract.balanceOf(address);
      console.log("token balance", balance);
      return fromBigNum(balance, token.decimal);
    }
  };

  const handleSlider = (newValue: number | number[]) => {
    let sValue = 0;
    if (Array.isArray(newValue)) {
      setValue(newValue[0]);
      sValue = newValue[0];
    } else {
      setValue(newValue);
      sValue = newValue;
    }
    const sAmount = (parseFloat(sourceBalance) * sValue) / 100;
    setSourceAmount(customFixed(sAmount));
  };

  const handleSourceAmount = (event: any) => {
    const value = event.target.value;
    setSourceAmount(value);
    setValue(1);
  };

  useEffect(() => {
    const initValues = async () => {
      if (isConnected && signer) {
        if (sourceToken.id === "ETH") {
          const sTokenBalance = await ethBalance();
          setSourceBalance(sTokenBalance!);
        } else {
          const sTokenBalance = await getTokenBalance(sourceToken);
          setSourceBalance(sTokenBalance!);
        }

        if (targetToken.id === "ETH") {
          const tTokenBalance = await ethBalance();
          setTargetBalance(tTokenBalance!);
        } else {
          const tTokenBalance = await getTokenBalance(targetToken);
          console.log("usdt balance", tTokenBalance);
          setTargetBalance(tTokenBalance!);
        }
      }
    };
    initValues();
  }, [isConnected, signer, sourceToken, targetToken]);

  useEffect(() => {
    handleSlider(value);
  }, [sourceBalance]);

  useEffect(() => {
    console.log(
      "change event",
      value,
      (parseFloat(sourceBalance) * value) / 100
    );
    const sValue = Math.floor((sourceAmount / parseFloat(sourceBalance)) * 100);
    setValue(sValue);
  }, [sourceAmount]);

  useEffect(() => {
    if (signer && sourceAmount > 0) {
      console.log("calcuating-----------", sourceToken.address, targetToken.address, toBigNum(sourceAmount, sourceToken.decimal));
      swapContract
        .getV3OutputTokenAmount(
          toBigNum(sourceAmount, sourceToken.decimal),
          sourceToken.address,
          targetToken.address
        )
        .then((amount: any) => {
          console.log("calcuating result", amount)
          const tAmount = fromBigNum(amount, targetToken.decimal);
          setTargetAmount(tAmount);
        });

    }
  }, [sourceAmount, dexVersion, targetToken, sourceToken]);

  return (
    <section className="h-full flex flex-col justify-center items-center pt-[5px]">
      {/* <Container className="flex flex-col items-center gap-8 py-5">
        <h1 className="text-gray-100 font-black text-3xl text-center">
          Aries Swap
        </h1>
        <p className="text-gray-500 text-center">
          Leverage-enabled swap, quickly and safely.
        </p>
      </Container> */}

      <div className="flex justify-center h-fit pt-6 pb-4">
        <div className="relative  h-fit">
          <div className="container max-w-lg">
            {/* You pay */}
            <div className="py-6 px-6 bg-gray-900 rounded-md flex flex-col gap-5">
              {/* Source content */}
              <div>
                <img
                  src={logo}
                  alt="babybtc"
                  className="max-w-full h-[120px] mx-auto"
                />
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex gap-3 items-center">
                    <button
                      className="flex flex-wrap items-center gap-x-2"
                      onClick={() => {
                        setcatatory("source");
                        setVisible(true);
                      }}
                    >
                      <p className="flex flex-wrap items-center gap-x-2 text-white">
                        <img
                          src={sourceToken?.image}
                          alt={`${sourceToken.id} logo`}
                          width="40"
                          height="40"
                          className="bg-white rounded-full w-7 h-7 p-1"
                          loading="lazy"
                        />
                        {sourceToken.id}
                      </p>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3 fill-current text-white"
                        viewBox="0 0 512 512"
                      >
                        <title>Open modal</title>
                        <path d="M98 190.06l139.78 163.12a24 24 0 0036.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                      </svg>
                    </button>
                  </div>
                  <span className="text-white">
                    {" "}
                    Balance: {sourceBalance} {sourceToken.id}
                  </span>
                </div>

                <div className="flex justify-center gap-10 pb-3 border-b-[1px] border-solid border-[#777777]">
                  <Radio
                    crossOrigin="true"
                    name="type"
                    color="light-blue"
                    label={<div className="font-bold text-white">v2</div>}
                    ripple={true}
                    onClick={() => setDexVersion("v2")}
                    checked={dexVersion === "v2"}
                    onChange={() => {
                      console.log("chainged");
                    }}
                  />
                  <Radio
                    crossOrigin="true"
                    name="type"
                    color="light-blue"
                    label={<div className="font-bold text-white">v3</div>}
                    ripple={true}
                    onClick={() => setDexVersion("v3")}
                    checked={dexVersion === "v3"}
                    onChange={() => {
                      console.log("chainged");
                    }}
                  />
                </div>

                <div className="w-full text-center">
                  <p className="inline-block bg-gray-600 font-semibold py-[3px] px-2 rounded-md text-white">
                    Automatic slippage
                  </p>
                </div>
                <div className="flex">
                  <MainInput
                    className="w-full text-[25px] resize-none"
                    placeholder="0.0"
                    type="number"
                    step={0.001}
                    value={sourceAmount}
                    readOnly={!isConnected ? "readOnly" : ""}
                    onChange={handleSourceAmount}
                  />
                </div>
                <div className="px-2 pb-8">
                  <Slider
                    marks={{
                      0: "0%",
                      25: "25%",
                      50: "50%",
                      75: "75%",
                      100: "100%",
                    }}
                    value={value}
                    className="bg-gray-900"
                    railStyle={{ backgroundColor: "#3F3F46" }}
                    trackStyle={{ backgroundColor: "#3B82F6" }}
                    onChange={handleSlider}
                  />
                </div>
              </div>
            </div>

            {/* Swap button */}
            <div className="h-2 relative">
              <div className="absolute top-[-18px] w-full flex justify-center">
                <button
                  className="bg-gray-900 w-12 h-12 flex flex-col justify-center items-center rounded-full border-4 border-[#111111] transition hover:bg-gray-800 text-gray-500"
                  onClick={changeToken}
                >
                  <Icon icon="iconamoon:swap" className="text-3xl" />
                </button>
              </div>
            </div>

            {/* You Receive */}

            <div className="py-6 px-6 bg-gray-900 rounded-md flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
                <div className="flex gap-3 items-center">
                  <button
                    className="flex flex-wrap items-center gap-x-2"
                    onClick={() => {
                      setcatatory("target");
                      setVisible(true);
                    }}
                  >
                    <p className="flex flex-wrap items-center gap-x-2 text-white">
                      <img
                        src={targetToken.image}
                        alt={`${targetToken.id} logo`}
                        width="40"
                        height="40"
                        className="bg-white rounded-full w-7 h-7 p-1"
                        loading="lazy"
                      />
                      {targetToken.id}
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 fill-current text-white"
                      viewBox="0 0 512 512"
                    >
                      <title>Open modal</title>
                      <path d="M98 190.06l139.78 163.12a24 24 0 0036.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                    </svg>
                  </button>
                </div>
                <span className="text-white">
                  {" "}
                  Balance: {targetBalance} {targetToken.id}
                </span>
              </div>
              <MainInput
                className="w-full text-[25px]"
                placeholder="0.0"
                type="number"
                step={0.001}
                value={targetAmount}
                readOnly={!isConnected ? "readOnly" : ""}
              />
            </div>

            {/* Button */}
            {!isConnected && (
              <div className="my-8">
                <FilledButton
                  className="w-full text-base py-3 font-semibold"
                  onClick={open}
                >
                  Connect Wallet
                </FilledButton>
              </div>
            )}
            {isConnected && signer && (
              <div className="my-8 grid grid-cols-2 gap-4">
                <div className="my-5">
                  <FilledButton
                    className="w-full text-base py-3 font-semibold"
                    onClick={() =>
                      swap(
                        sourceAmount,
                        sourceToken.address!,
                        targetToken.address!
                      )
                    }
                  >
                    Swap
                  </FilledButton>
                </div>

                <div className="my-5">
                  <FilledButton
                    className="w-full text-base py-3 font-semibold"
                    onClick={airdrop}
                  >
                    Airdrop
                  </FilledButton>
                </div>
              </div>
            )}

            {isConnected && !signer && (
              <div className="my-5">
                <FilledButton
                  className="w-full text-base py-3 font-semibold"
                  onClick={() => switchNetwork?.(Number(chainId))}
                >
                  Switch network
                </FilledButton>
              </div>
            )}
          </div>
        </div>
      </div>
      <SelectDialog
        visible={visible}
        setVisible={setVisible}
        sourceToken={sourceToken}
        targetToken={targetToken}
        setSource={setSource}
        setTarget={setTarget}
        catagory={catatory}
      />
    </section>
  );
}
