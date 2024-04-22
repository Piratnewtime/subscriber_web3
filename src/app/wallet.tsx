'use client';

import networks, { Network } from "./networks";
import { PropsWithChildren, useState, useEffect, createContext, useContext, useCallback } from "react";
import type { WalletState } from '@web3-onboard/core';
import metamaskSDK from '@web3-onboard/metamask';
import {
  init,
  useAccountCenter,
  useConnectWallet,
  useNotifications,
  useSetChain,
  useWallets,
  useSetLocale
} from '@web3-onboard/react';

// initialize the module with options
const metamaskSDKWallet = metamaskSDK({options: {
  extensionOnly: false,
  dappMetadata: {
    name: 'Demo Web3Onboard'
  }
}})

init({
  // ... other Onboard options
  accountCenter: {
    desktop: {
      enabled: true,
      position: 'topRight'
    },
    mobile: {
      enabled: true,
      position: 'topRight'
    }
  },
  connect: {
    autoConnectAllPreviousWallet: true
  },
  wallets: [
    metamaskSDKWallet,
    //... other wallets
    // Make sure to pass in before or above the injected-wallets module
    //injectedWalletModule
  ],
  chains: [
    {
      namespace: 'evm',
      id: 56
    }
  ]
});

type WrappedData = {
  isInit: boolean
  chainId: string
  network: Network
  connecting: boolean
  wallet: WalletState | null
  setChainId: (value: string) => void
  setProvider: () => void
  disconnect: () => void
  sendTransaction: (tx: any) => Promise<string | void>
}

export const Wallet = createContext<WrappedData>({
  isInit: false,
  chainId: networks[0].chainId,
  network: networks[0],
  connecting: false,
  wallet: null,
  setChainId: () => {},
  setProvider: () => {},
  disconnect: () => {},
  sendTransaction: async () => {}
});

export const WalletContext = () => useContext(Wallet);

export default function WalletWrapper ({ children }: PropsWithChildren) {
  const [ isInit, setInit ] = useState<boolean>(false);
  const [ chainId, setChainId ] = useState<string>(networks[0].chainId);
  const [ network, setNetwork ] = useState<Network>(networks[0]);
  const [{ chains, connectedChain, settingChain }, setChain ] = useSetChain();
  const [{ wallet, connecting }, connect, disconnectWeb3, updateBalances, setWalletModules] = useConnectWallet();

  const chooseChainId = useCallback((value: string) => {
    setChainId(value);
    const network = networks.find(_ => _.chainId === value)!;
    setNetwork(network);
    window.localStorage.setItem('chainId', value);
  }, []);

  const chooseProvider = useCallback(() => connect(), []);

  const disconnect = useCallback(() => {
    disconnectWeb3({ label: wallet!.label! });
  }, [wallet]);

  const sendTransaction = useCallback(async (tx: any) => {
    if (!wallet) return;

    const chainIdHex = '0x' + parseInt(chainId).toString(16);

    if (connectedChain?.id !== chainIdHex) {
      const changingChain = await setChain({ chainId: chainIdHex });
      if (!changingChain) return;
    }

    return await wallet.provider.request({
      method: "eth_sendTransaction",
      params: [
        tx
      ],
    }) as string;
  }, [wallet, chainId, connectedChain]);

  useEffect(() => {
    const savedChainId = window.localStorage.getItem('chainId');
    if (savedChainId) {
      const network = networks.find(_ => _.chainId === savedChainId);
      if (network) {
        setChainId(savedChainId);
        setNetwork(network);
      }
    }
    setInit(true);
  }, []);

  return <Wallet.Provider value={{
    isInit,
    chainId,
    network,
    connecting,
    wallet,
    setChainId: chooseChainId,
    setProvider: chooseProvider,
    disconnect,
    sendTransaction
  }}>{children}</Wallet.Provider>
}