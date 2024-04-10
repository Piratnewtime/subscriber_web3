import axios from 'axios';
// import { Network } from './networks';

const host = 'https://api.web3pay.online';

export type EventSubsctiprion = {
  id: string
  chainId: string
  spender: string
  receiver: string
  orderId: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  index: number
  timestamp: string
}

export type EventCancellation = {
  id: string
  chainId: string
  spender: string
  receiver: string
  orderId: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  index: number
  timestamp: string
}

export type EventExecution = {
  id: string
  chainId: string
  spender: string
  receiver: string
  orderId: string
  executor: string | null
  serviceFee: string
  executorFee: string
  executedInPoolId: string | null
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  index: number
  timestamp: string
}

export function OutcomesHistory (chainId: string, address: string) {
  return axios.get(`${host}/outcomes/${chainId}/${address}/history`).then(({ data }) => data) as Promise<{
    subscriptions: EventSubsctiprion[]
    cancellations: EventCancellation[]
    executions: EventExecution[]
  }>
}

export function IncomesHistory (chainId: string, address: string) {
  return axios.get(`${host}/incomes/${chainId}/${address}/history`).then(({ data }) => data) as Promise<{
    subscriptions: EventSubsctiprion[]
    cancellations: EventCancellation[]
    executions: EventExecution[]
  }>
}

export function Processing (chainId: string) {
  return axios.get(`${host}/processing/${chainId}`).then(({ data }) => data) as Promise<{
    poolBlockNumber: string
    totalRewards: { [contract: string]: string }
    orders: string[]
    limit: number
  }>
}