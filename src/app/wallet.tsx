'use client';

import { PropsWithChildren, useState, useEffect, createContext, useContext, useCallback } from "react";

import providers, { ProviderWrapper } from "./providers";
import networks, { Network } from "./networks";

type WrappedData = {
  isInit: boolean
  chainId: string
  network: Network
  providerKey: string
  provider: ProviderWrapper | null
  account: string | null
  setChainId: (value: string) => void
  setProvider: (value: string) => void
  disconnect: () => void
}

export const Wallet = createContext<WrappedData>({
  isInit: false,
  chainId: networks[0].chainId,
  network: networks[0],
  providerKey: '',
  provider: null,
  account: null,
  setChainId: () => {},
  setProvider: () => {},
  disconnect: () => {}
});

export const WalletContext = () => useContext(Wallet);

export default function WalletWrapper ({ children }: PropsWithChildren) {
  const [ isInit, setInit ] = useState<boolean>(false);
  const [ chainId, setChainId ] = useState<string>(networks[0].chainId);
  const [ network, setNetwork ] = useState<Network>(networks[0]);
  const [ providerKey, setProviderKey ] = useState<string>('');
  const [ provider, setProvider ] = useState<ProviderWrapper | null>(null);
  const [ account, setAccount ] = useState<string | null>(null);

  const chooseChainId = useCallback((value: string) => {
    setChainId(value);
    const network = networks.find(_ => _.chainId === value)!;
    setNetwork(network);
    window.localStorage.setItem('chainId', value);
  }, []);

  const chooseProvider = useCallback(async (value: string) => {
    //setProvider(e.detail);
    //window.localStorage.setItem('provider', e.detail);
    console.log('Selected provider:', value);
    const provider = providers.find(item => item.key === value);
    if (!provider) {
      console.warn(`Provider '${value}' doesn't exist.`);
      return;
    }
    const instance = new provider.class();
    if (!instance.isInjected()) {
      console.warn(`Provider '${value}' isn't installed.`);
      return;
    }
    try {
      const address = await instance.getAccount();
      console.log('Address', address);
      setAccount(address);
      setProviderKey(value);
      window.localStorage.setItem('provider', value);
      setProvider(instance);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setProviderKey('');
    window.localStorage.removeItem('provider');
  }, []);

  useEffect(() => {
    const savedChainId = window.localStorage.getItem('chainId');
    if (savedChainId) {
      const network = networks.find(_ => _.chainId === savedChainId);
      if (network) {
        setChainId(savedChainId);
        setNetwork(network);
      }
    }
    const savedProvider = window.localStorage.getItem('provider');
    if (savedProvider) chooseProvider(savedProvider);
    setInit(true);
  }, []);

  return <Wallet.Provider value={{
    isInit,
    chainId,
    network,
    providerKey,
    provider,
    account,
    setChainId: chooseChainId,
    setProvider: chooseProvider,
    disconnect
  }}>{children}</Wallet.Provider>
}