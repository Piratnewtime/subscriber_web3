'use client';

import { ReactNode, useCallback, useEffect, useState } from "react";
import { Box, LinearProgress, Skeleton, Stack } from "@mui/material";
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import SyncProblemRoundedIcon from '@mui/icons-material/SyncProblemRounded';
import ProductionQuantityLimitsRoundedIcon from '@mui/icons-material/ProductionQuantityLimitsRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import PlaylistRemoveRoundedIcon from '@mui/icons-material/PlaylistRemoveRounded';

import Tabs from "./tabs";
import { HistoryItem, InnerButton, PaymentItem, ScheduleBlock, ScheduleHistoryBlock } from "./ui";
import DialogNewPayment from "./dialogNewPayment";
import { InitContract, ListenEvent, OrderWithToken, getCounter, getErc20Decimals, getErc20Name, getErc20Symbol, getExecutorCommission, getIncomes, getOrder, getOutcomes, getServiceCommission, waitForTransaction } from "./contractInteractions";
import { WalletContext } from "./wallet";
import DialogOrderInfo from "./dialogOrderInfo";
import { ContractEventPayload, ethers } from "ethers";

import * as api from './api';
import { Switch } from "./switch";
import { Button } from "./dialogTemplate";
import BigNumber from "bignumber.js";
import PoolStack from "./poolStack";
import axios from "axios";
import DialogHistoryInfo from "./dialogHistoryInfo";
import DialogNewInvoice from "./dialogNewInvoice";
import ScaleHandler from "./scaleHandler";

const delayTime = 60 * 60 * 6;

const h3Titles: { [key: string]: string } = {
  'payments': 'Schedule',
  'incomingPayments': 'Schedule',
  'earn': 'Processing center'
};

export default function Home() {
  const wallet = WalletContext();
  const screen = ScaleHandler();

  const [ tab, setTab ] = useState<string>('payments');
  const [ listSwitch, setListSwitch ] = useState<string>('');
  const [ openCreateDialog, setOpenCreateDialog ] = useState<boolean>(false);
  
  const [ isLoading, setLoading ] = useState<boolean>(true);
  const [ tokensInfo, setTokensInfo ] = useState<{ [token: string]: {
    name: string
    denom: string
    decimals: number
    logo: string
    processingFee: bigint
    serviceFee: {
        min: bigint
        max: bigint
        percent: bigint
        div: bigint
    }
  } }>({});
  const [ totalOutcomes, setTotalOutcomes ] = useState<number>(0);
  const [ outcomes, setOutcomes ] = useState<OrderWithToken[]>([]);
  const [ isLoadingOutHistory, setLoadingOutHistory ] = useState<boolean>(false);
  const [ outcomesHistory, setOutcomesHistory ] = useState<HistoryItem[]>();
  const [ totalIncomes, setTotalIncomes ] = useState<number>(0);
  const [ incomes, setIncomes ] = useState<OrderWithToken[]>([]);
  const [ isLoadingInHistory, setLoadingInHistory ] = useState<boolean>(false);
  const [ incomesHistory, setIncomesHistory ] = useState<HistoryItem[]>();
  const [ historyOrders, setHistoryOrders ] = useState<OrderWithToken[]>([]);
  
  const loadOrder = useCallback(async (orderId: bigint, missingTime: number = (Date.now() / 1000) - delayTime): Promise<OrderWithToken> => {
    const order = await getOrder(wallet.network, orderId.toString());
    if (!tokensInfo[order.token]) {
      console.log('Load token info for:', order.token);

      const tokenShortInfo = {
        name: 'Custom token: ' + order.token,
        denom: '$TOKEN',
        decimals: 0,
        logo: '/tokens/unknown.webp',
        processingFee: BigInt(0),
        serviceFee: {
          min: BigInt(0),
          max: BigInt(0),
          percent: BigInt(0),
          div: BigInt(0)
        }
      };

      const token = wallet.network.tokens.find(_ => _.contract.toLowerCase() === order.token.toLowerCase());
      if (token) {
        tokenShortInfo.name = token.name;
        tokenShortInfo.denom = token.denom;
        tokenShortInfo.decimals = token.decimals;
        tokenShortInfo.logo = token.icon;
      } else {
        console.log('Loading data from blockchain...');
        try {
          const [
            name,
            denom,
            decimals
          ] = await Promise.all([
            getErc20Name(wallet.network, order.token),
            getErc20Symbol(wallet.network, order.token),
            getErc20Decimals(wallet.network, order.token)
          ]);
          tokenShortInfo.name = name;
          tokenShortInfo.denom = denom;
          tokenShortInfo.decimals = parseInt(decimals.toString());
        } catch (e) {
          console.error(e);
        }
      }

      try {
        console.log('Loading commission info...');
        const [ processingFee, serviceFee ] = await Promise.all([
          getExecutorCommission(wallet.network, order.token),
          getServiceCommission(wallet.network, order.token)
        ]);
        tokenShortInfo.processingFee = processingFee;
        tokenShortInfo.serviceFee.min = serviceFee.min;
        tokenShortInfo.serviceFee.max = serviceFee.max;
        tokenShortInfo.serviceFee.percent = serviceFee.percent;
        tokenShortInfo.serviceFee.div = serviceFee.percentDiv;
      } catch (e) {
        console.error(e);
      }

      tokensInfo[order.token] = tokenShortInfo;
      setTokensInfo({ ...tokensInfo });
    }

    return {
      id: orderId,
      isMissed: parseInt(order.nextTime.toString()) < missingTime,
      spender: order.spender,
      spenderLinkIndex: order.spenderLinkIndex,
      receiver: order.receiver,
      receiverLinkIndex: order.receiverLinkIndex,
      token: order.token,
      amount: order.amount,
      period: order.period,
      nextTime: order.nextTime,
      memo: order.memo,
      createdAt: order.createdAt,
      cancelledAt: order.cancelledAt,
      tokenInfo: tokensInfo[order.token]
    };
  }, [wallet.network]);

  const checkHistoryOrder = useCallback(async (orderId: bigint) => {
    if (!historyOrders.find(order => order.id === orderId)) {
      const exist = (tab === 'payments' ? outcomes : incomes).find(order => order.id === orderId);
      if (exist) {
        setHistoryOrders(arr => {
          const newArr = [...arr];
          const itemIndex = newArr.findIndex(item => item.id === orderId);
          if (itemIndex > -1) {
            newArr.splice(itemIndex, 1, exist);
          } else {
            newArr.push(exist);
          }
          return newArr;
        });
      } else {
        const order = await loadOrder(orderId);
        setHistoryOrders(arr => {
          const newArr = [...arr];
          const itemIndex = newArr.findIndex(item => item.id === orderId);
          if (itemIndex > -1) {
            newArr.splice(itemIndex, 1, order);
          } else {
            newArr.push(order);
          }
          return newArr;
        });
      }
    }
  }, [tab, outcomes, incomes, historyOrders]);

  const addOutcomeOrder = useCallback(async (orderId: bigint, missingTime: number = (Date.now() / 1000) - delayTime) => {
    const order = await loadOrder(orderId, missingTime);
    setOutcomes(arr => {
      const newArr = [...arr];
      const itemIndex = newArr.findIndex(item => item.id === orderId);
      if (itemIndex > -1) {
        newArr.splice(itemIndex, 1, order);
      } else {
        newArr.push(order);
      }
      newArr.sort((a, b) => parseInt(a.nextTime.toString()) - parseInt(b.nextTime.toString()));
      return newArr;
    });
  }, [wallet.wallet?.accounts, outcomes, tokensInfo]);

  const addIncomeOrder = useCallback(async (orderId: bigint, missingTime: number = (Date.now() / 1000) - delayTime) => {
    const order = await loadOrder(orderId, missingTime);
    setIncomes(arr => {
      const newArr = [...arr];
      const itemIndex = newArr.findIndex(item => item.id === orderId);
      if (itemIndex > -1) {
        newArr.splice(itemIndex, 1, order);
      } else {
        newArr.push(order);
      }
      newArr.sort((a, b) => parseInt(a.nextTime.toString()) - parseInt(b.nextTime.toString()));
      return newArr;
    });
  }, [wallet.wallet?.accounts, incomes, tokensInfo]); 

  useEffect(() => {
    if (!wallet.network || !wallet.wallet?.accounts.length) return;

    const contract = InitContract(wallet.network);
    const hexAddress32 = ethers.zeroPadValue(wallet.wallet.accounts[0].address, 32);

    /** INCOMES */
    const incomes = ListenEvent(wallet.network, contract, [
      // Subscription (address indexed spender, address indexed receiver, uint id)
      ethers.id('Subscription(address,address,uint256)'),
      null,
      hexAddress32
    ], (event: ContractEventPayload) => {
      console.log('Subscription Income', BigInt(event.log.data), event);
      setTotalIncomes(n => n + 1);
      addIncomeOrder(BigInt(event.log.data));
    });

    /** OUTCOMES */
    const outcomes = ListenEvent(wallet.network, contract, [
      // Subscription (address indexed spender, address indexed receiver, uint id)
      ethers.id('Subscription(address,address,uint256)'),
      hexAddress32
    ], (event: ContractEventPayload) => {
      console.log('Subscription Outcome', BigInt(event.log.data), event);
      setTotalOutcomes(n => n + 1);
      addOutcomeOrder(BigInt(event.log.data));
    });

    /** CANCELLATION */
    const cancellation = ListenEvent(wallet.network, contract, [
      // Cancellation (address indexed spender, address indexed receiver, uint id)
      ethers.id('Cancellation(address,address,uint256)')
    ], (event: ContractEventPayload) => {
      const orderId = BigInt(event.log.data);
      console.log('Cancellation', orderId, event);
      if (event.log.topics[1] === hexAddress32) {
        // outcome
        console.log('Cancelled outcome');
        setOutcomes(arr => arr.filter(order => order.id !== orderId));
        setTotalOutcomes(n => n - 1);
      } else if (event.log.topics[2] === hexAddress32) {
        // income
        console.log('Cancelled income');
        setIncomes(arr => arr.filter(order => order.id !== orderId));
        setTotalIncomes(n => n - 1);
      }
    });

    /** EXEC INCOMES */
    const execIncomes = ListenEvent(wallet.network, contract, [
      // Execution (address indexed spender, address indexed receiver, uint id, uint serviceFee, uint executorFee)
      ethers.id('Execution(address,address,uint256,uint256,uint256)'),
      null,
      hexAddress32
    ], (event: ContractEventPayload) => {
      console.log('Execution Income', BigInt(event.log.data), event);
      addIncomeOrder(BigInt(event.log.data));
    });

    /** EXEC OUTCOMES */
    const execOutcomes = ListenEvent(wallet.network, contract, [
      // Execution (address indexed spender, address indexed receiver, uint id, uint serviceFee, uint executorFee)
      ethers.id('Execution(address,address,uint256,uint256,uint256)'),
      hexAddress32
    ], (event: ContractEventPayload) => {
      console.log('Execution Outcome', BigInt(event.log.data), event);
      addOutcomeOrder(BigInt(event.log.data));
    });

    return () => {
      contract.removeAllListeners();
      incomes.stop();
      outcomes.stop();
      cancellation.stop();
      execIncomes.stop();
      execOutcomes.stop();
    }
  }, [wallet.network, wallet.wallet?.accounts, addOutcomeOrder, addIncomeOrder]);

  useEffect(() => {
    if (!wallet.isInit) return;
    if (!wallet.wallet?.accounts.length) {
      setTotalOutcomes(0);
      setOutcomes([]);
      setTotalIncomes(0);
      setIncomes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log('Loading orders');
    
    getCounter(wallet.network, wallet.wallet.accounts[0].address).then(async (counter) => {
      const address = wallet.wallet?.accounts[0]?.address;
      if (!address) {
        setLoading(false);
        return [];
      }

      setTotalOutcomes(parseInt(counter.outcomes.toString()));
      setTotalIncomes(parseInt(counter.incomes.toString()));
      const missingTime = (Date.now() / 1000) - delayTime;

      const idsOutcomePromises: Promise<bigint>[] = [];
      for (let index = BigInt(0); index < counter.outcomes; index++) {
        idsOutcomePromises.push(getOutcomes(wallet.network, address, index.toString()));
      }

      const outcomeOrdersIds = await Promise.all(idsOutcomePromises);

      for (const orderId of outcomeOrdersIds) {
        await addOutcomeOrder(orderId, missingTime);
      }

      const idsIncomePromises: Promise<bigint>[] = [];
      for (let index = BigInt(0); index < counter.incomes; index++) {
        idsIncomePromises.push(getIncomes(wallet.network, address, index.toString()));
      }

      const incomeOrdersIds = await Promise.all(idsIncomePromises);

      for (const orderId of incomeOrdersIds) {
        await addIncomeOrder(orderId, missingTime);
      }

      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });

    return () => {
      setTotalOutcomes(0);
      setOutcomes([]);
      setTotalIncomes(0);
      setIncomes([]);
      setOutcomesHistory(undefined);
      setIncomesHistory(undefined);
      setHistoryOrders([]);
      setLoading(true);
    }
  }, [wallet.isInit, wallet.wallet?.accounts]);

  useEffect(() => {
    if (!['payments', 'incomingPayments'].includes(tab)) return;
    if (listSwitch !== 'history') return;
    if (!wallet.chainId || !wallet.wallet?.accounts.length) return;
    if (tab === 'payments') {
      if (isLoadingOutHistory || outcomesHistory) return;
      setLoadingOutHistory(true);
    } else {
      if (isLoadingInHistory || incomesHistory) return;
      setLoadingInHistory(true);
    }
    (async function (chainId: string, account: string) { 
      const logs = tab === 'payments' ? await api.OutcomesHistory(chainId, account) : await api.IncomesHistory(chainId, account);

      const list: HistoryItem[] = [];

      for (const log of logs.executions) {
        await checkHistoryOrder(BigInt(log.orderId));
        list.push({
          type: 'execution',
          ...log
        })
      }

      for (const log of logs.cancellations) {
        await checkHistoryOrder(BigInt(log.orderId));
        list.push({
          type: 'cancellation',
          ...log
        })
      }

      for (const log of logs.subscriptions) {
        await checkHistoryOrder(BigInt(log.orderId));
        list.push({
          type: 'subscription',
          ...log
        })
      }

      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (tab === 'payments') {
        setOutcomesHistory(list);
      } else {
        setIncomesHistory(list);
      }
    })(wallet.chainId, wallet.wallet.accounts[0].address).then(() => {
      if (tab === 'payments') {
        setLoadingOutHistory(false);
      } else {
        setLoadingInHistory(false);
      }
    }).catch(e => {
      console.error(e);
      if (tab === 'payments') {
        setLoadingOutHistory(false);
      } else {
        setLoadingInHistory(false);
      }
    })
  }, [wallet.isInit, wallet.wallet?.accounts, tab, listSwitch, isLoadingInHistory, isLoadingOutHistory, outcomesHistory, incomesHistory]);

  useEffect(() => {
    if (!document.location.hash) return;
    const hash = document.location.hash.slice(1);
    const [ key, value ] = hash.split('=');
    if (key !== 'invoice') return;
    try {
      const data = JSON.parse(Buffer.from(value, 'base64').toString());
      if (!data || data instanceof Array || typeof data !== 'object') throw new Error(`Incorrect invoice format (${typeof data})`);
      setOpenCreateDialog(true);
    } catch (e) {
      console.error(e);
      document.location.hash = '';
    }
  }, []);

  return (<>
    <h3 style={{ fontSize: '24px', fontWeight: '300', textShadow: '0px 4px 4px rgb(0 0 0 / 40%)' }}>{h3Titles[tab]}</h3>
    <main>
      <Box marginBottom='35px'>
        <Tabs active={tab} setTab={setTab} />
      </Box>
      {
        ['payments', 'incomingPayments'].includes(tab) ?
          <>
            <Stack direction={screen.isMobile ? 'column' : 'row'} gap='10px' justifyContent='space-between'>
              <Switch
                value={listSwitch}
                options={[
                  { key: 'active', value: 'Active orders' },
                  { key: 'history', value: 'History' }
                ]}
                onSwitch={setListSwitch}
              />
              {
                listSwitch !== 'history' ?
                  tab === 'payments' ?
                    <InnerButton onClick={() => setOpenCreateDialog(true)} endsIcon={<CurrencyExchangeRoundedIcon style={{ fontSize: '26px' }} />}><Box width='100%' textAlign='center' fontSize='18px' fontWeight='300' color='rgba(255 255 255 / 75%)'>Create new payment</Box></InnerButton>
                  :
                    <InnerButton onClick={() => setOpenCreateDialog(true)} endsIcon={<ReceiptRoundedIcon style={{ fontSize: '26px' }} />}><Box width='100%' textAlign='center' fontSize='18px' fontWeight='300' color='rgba(255 255 255 / 75%)'>Create invoice</Box></InnerButton>
                : ''
              }
            </Stack>
            {
              tab === 'payments' ?
                <DialogNewPayment open={openCreateDialog} handleClose={() => setOpenCreateDialog(false)} />
              :
                <DialogNewInvoice open={openCreateDialog} handleClose={() => setOpenCreateDialog(false)} />
            }
          </>
        : ''
      }
      {
        ['payments', 'incomingPayments'].includes(tab) ?
          listSwitch === 'history' ?
            <HistoryList
              tab={tab}
              isLoading={ tab === 'payments' ? isLoadingOutHistory : isLoadingInHistory }
              orders={historyOrders}
              history={ tab === 'payments' ? (outcomesHistory ?? []) : (incomesHistory ?? []) }
              total={ tab === 'payments' ? (outcomesHistory?.length ?? 0) : (incomesHistory?.length ?? 0) }
            />
          :
            <OrderList
              tab={tab}
              isLoading={isLoading}
              orders={ tab === 'payments' ? outcomes : incomes }
              total={ tab === 'payments' ? totalOutcomes : totalIncomes }
            />
        :
          <ProcessingCenter />
      }
    </main>
  </>);
}

type OrderListProps = {
  tab: string
  orders: OrderWithToken[]
  total: number
  isLoading: boolean
}

function OrderList ({ tab, orders, total, isLoading }: OrderListProps) {
  const [ selectedOrder, selectOrder ] = useState<OrderWithToken>();

  const blocks: {
    date: string
    orders: OrderWithToken[]
  }[] = [];
  let lastDate = '';
  for (const order of orders) {
    const date = new Date(parseInt(order.nextTime.toString()) * 1000).toLocaleDateString();
    if (lastDate != date) {
      blocks.push({
        date,
        orders: []
      });
      lastDate = date;
    }

    blocks[blocks.length - 1].orders.push(order);
  }

  const placeholders: ReactNode[] = [];
  if (total && total > orders.length) {
    for (let i = total - orders.length; i > 0; i--) {
      placeholders.push(<Skeleton key={`skeleton_${i}`} variant='rounded' width='100%' height='66px' sx={{ bgcolor: 'rgb(225 150 170 / 50%)' }} />);
    }
  }

  return <>
    { isLoading ? <Box margin='20px 0px'><LinearProgress color="secondary" /></Box> : '' }

    {
      !total ?
        <Stack
          direction='row'
          justifyContent='center'
          alignItems='center'
          gap='5px'
          style={{
            height: '150px',
            fontSize: '21px',
            color: '#ffffff9e'
          }}>
          {
            tab === 'payments' ?
              <><SyncProblemRoundedIcon style={{ fontSize: '40px' }} /> You don't have any recurring payments</>
            :
              <><ProductionQuantityLimitsRoundedIcon style={{ fontSize: '40px' }} /> There are no incoming payments</>
          }
        </Stack>
      : ''
    }

    { blocks.map((block, i) => <ScheduleBlock key={`sheduleBlock_${i}`} direction={tab === 'payments' ? 'outcome' : 'income'} selectOrder={selectOrder} {...block} />) }

    { placeholders.length ? <Stack direction='column' gap='20px' style={{ marginTop: '20px' }}>{placeholders}</Stack> : '' }

    { selectedOrder ? <DialogOrderInfo open={true} handleClose={() => selectOrder(undefined)} order={selectedOrder} /> : '' }
  </>
}

type HistoryListProps = {
  tab: string
  orders: OrderWithToken[]
  history: HistoryItem[]
  total: number
  isLoading: boolean
}

function HistoryList ({ tab, orders, history, total, isLoading }: HistoryListProps) {
  const [ selectedOrder, selectOrder ] = useState<{ order: OrderWithToken, item: HistoryItem }>();

  const blocks: {
    date: string
    history: {
      item: HistoryItem
      order: OrderWithToken
    }[]
  }[] = [];
  let lastDate = '';
  for (const item of history) {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (lastDate != date) {
      blocks.push({
        date,
        history: []
      });
      lastDate = date;
    }
    const orderId = BigInt(item.orderId);
    const order = orders.find(_ => _.id === orderId);
    if (!order) {
      console.error('Order doesn\'t found', orderId, order);
      continue;
    }

    blocks[blocks.length - 1].history.push({
      item,
      order
    });
  }

  return <>
    { isLoading ? <Box margin='20px 0px'><LinearProgress color="secondary" /></Box> : '' }

    {
      isLoading || !total ?
        <Stack
          direction='row'
          justifyContent='center'
          alignItems='center'
          gap='5px'
          style={{
            height: '150px',
            fontSize: '21px',
            color: '#ffffff9e'
          }}>
          {
            isLoading ?
              <><ChecklistRoundedIcon style={{ fontSize: '40px' }} /> Loading history...</>
            :
              <><PlaylistRemoveRoundedIcon style={{ fontSize: '40px' }} /> No history yet</>
          }
        </Stack>
      : ''
    }

    { blocks.map((block, i) => <ScheduleHistoryBlock key={`sheduleHistoryBlock_${i}`} direction={tab === 'payments' ? 'outcome' : 'income'} selectOrder={selectOrder} {...block} />) }

    { selectedOrder ? <DialogHistoryInfo open={true} handleClose={() => selectOrder(undefined)} historyItem={selectedOrder} /> : '' }
  </>
}

function ProcessingCenter () {
  const wallet = WalletContext();
  const screen = ScaleHandler();
  const [ isLoading, setLoading ] = useState<boolean>(true);
  const [ limit, setLimit ] = useState<number>(0);
  const [ pool, setPool ] = useState<string[]>([]);
  const [ poolBlockNumber, setPoolBlockNumber ] = useState<string>();
  const [ rewards, setRewards ] = useState<string[]>();
  const [ fee, setFee ] = useState<string>();
  const [ feeUsd, setFeeUsd ] = useState<string>();
  const [ isExecuting, setExecuting ] = useState<boolean>(false);

  const update = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.Processing(wallet.chainId);
      setLimit(res.limit);
      setPool(res.orders);
      setPoolBlockNumber(res.poolBlockNumber);

      if (res.orders.length) {
        const rewards: string[] = [];
        for (const contract in res.totalRewards) {
          const info = wallet.network.tokens.find(_ => _.contract.toLowerCase() === contract.toLowerCase());
          if (!info) continue;
          const amount = new BigNumber(res.totalRewards[contract]).div(10 ** info.decimals);
          if (res.expectedRewards[contract] != res.totalRewards[contract]) {
            const expectedAmount = new BigNumber(res.expectedRewards[contract]).div(10 ** info.decimals);
            rewards.push(`${expectedAmount} ... ${amount} ${info.denom}`);
          } else {
            rewards.push(`${amount} ${info.denom}`);
          }
        }
        setRewards(rewards);

        if (!wallet.wallet?.accounts.length) {
          setFee(undefined);
          setFeeUsd(undefined);
          return;
        }

        const Contract = InitContract(wallet.network);
        const gasPrice = (await Contract.runner?.provider?.getFeeData())?.gasPrice || BigInt(0);
        const gas = await Contract.ExecuteMany.estimateGas(res.poolBlockNumber, res.orders, { from: wallet.wallet.accounts[0].address });
        const fee = new BigNumber(gas.toString()).times(gasPrice.toString()).div(1e18);
        setFee(fee.toString());

        const reqNativePrice = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${wallet.network.coingeckoId}&vs_currencies=usd`).then(({ data }) => data) as {
          [id: string]: {
            [curr: string]: number
          }
        };
        const nativePrice = reqNativePrice[wallet.network.coingeckoId]?.['usd'];

        if (typeof nativePrice !== 'undefined') setFeeUsd(fee.times(nativePrice).toFixed(2));
      } else {
        setRewards(undefined);
        setFee(undefined);
        setFeeUsd(undefined);
      }

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [wallet.chainId, wallet.network, wallet.wallet?.accounts]);

  const execute = useCallback(async () => {
    if (!wallet.isInit || !wallet.wallet?.accounts.length) return;
    setExecuting(true);
    try {
      const Contract = InitContract(wallet.network);
      const tx = await Contract.ExecuteMany.populateTransaction(poolBlockNumber, pool, { from: wallet.wallet.accounts[0].address });
      try {
        const txHash = await wallet.sendTransaction(tx);
        if (txHash) {
          try {
            await waitForTransaction(wallet.network, txHash);
            update();
          } catch (txError) {
            console.error(txError);
          }
        }
      } catch (signError) {
        console.error(signError);
      }
    } catch (buildError) {
      console.error(buildError);
    }
    setExecuting(false);
  }, [wallet, poolBlockNumber, pool]);

  useEffect(() => {
    if (!wallet.isInit) return;
    update();
    const intervalId = setInterval(update, 60_000);

    const Contract = InitContract(wallet.network);
    const executionPool = ListenEvent(wallet.network, Contract, [
      // ExecutionPool (address indexed executor, uint execBlockNumber)
      ethers.id('ExecutionPool(address,uint)')
    ], (event: ContractEventPayload) => {
      console.log('Execution pool event', event);
      update();
    });

    return () => {
      clearInterval(intervalId);
      executionPool.stop();
    }
  }, [wallet.isInit, wallet.network, wallet.wallet?.accounts]);

  return <>
    { isLoading ? <Box margin='20px 0px'><LinearProgress color="secondary" /></Box> : '' }
    <Stack direction='column' alignItems='center' gap='60px'>
      <Stack direction={screen.isMobile ? 'column' : 'row'} alignItems={screen.isMobile ? 'center' : 'flex-start'} gap='40px'>
        <Stack direction='column' gap='10px' style={{ fontSize: '24px', fontWeight: '300' }}>
          <div style={{ textAlign: 'center', fontWeight: '100', opacity: '0.8' }}>Pool</div>
          <div>
            <PoolStack level={limit ? Math.min((pool.length / limit) * 100, 100) : 0} />
          </div>
        </Stack>
        <Stack direction='column' gap='10px' alignItems='flex-start' style={{ fontSize: '24px', fontWeight: '300' }}>
          <div style={{ fontWeight: '100', opacity: '0.8', alignSelf: (screen.isMobile ? 'center' : undefined) }}>Current state</div>
          <Stack direction='row' gap='5px'>
            <span>Pool:</span>
            <span>{pool.length} subscriptions</span>
          </Stack>
          {
            rewards?.length ?
              <Stack direction='row' gap='5px'>
                <span>Earn:</span>
                <Stack direction='column' style={{ color: '#49A600' }}>
                  {rewards.map(amount => <span>+{amount}</span>)}
                </Stack>
              </Stack>
            : ''
          }
          {
            fee ?
              <Stack direction='row' flexWrap='wrap' gap='5px'>
                <span>Tx fee:</span>
                <span style={{ color: '#FF9900' }}>{fee} {wallet.network.denom}</span>
                {
                  feeUsd ? <span style={{ color: '#FF9900' }}>(${feeUsd})</span> : ''
                }
              </Stack>
            : ''
          }
          <div style={{ paddingTop: '25px' }}>
            <Button onClick={execute} loading={isExecuting} disabled={isLoading || !pool.length || isExecuting}><PlayCircleOutlineRoundedIcon style={{ fontSize: '20px', verticalAlign: 'bottom' }} /> Execute payments & earn money</Button>
          </div>
        </Stack>
      </Stack>
    </Stack>
  </>
}