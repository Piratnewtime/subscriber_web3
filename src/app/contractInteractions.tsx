import { ethers } from "ethers";

import { contractAbi } from "./contractAbi";
import { erc20Abi } from "./erc20Abi";
import { Network } from "./networks";
import BigNumber from "bignumber.js";

export function InitErc20Contract (network: Network, token: string) {
    const provider = new ethers.JsonRpcProvider(network.rpc);
    return new ethers.Contract(token, erc20Abi, provider);
}

export function InitContract (network: Network) {
    const provider = new ethers.JsonRpcProvider(network.rpc);
    return new ethers.Contract(network.contract, contractAbi, provider);
}

// Erc20 standard contract

export function getErc20Name (network: Network, token: string) {
    return InitErc20Contract(network, token).name() as Promise<string>;
}

export function getErc20Symbol (network: Network, token: string) {
    return InitErc20Contract(network, token).symbol() as Promise<string>;
}

export function getErc20Decimals (network: Network, token: string) {
    return InitErc20Contract(network, token).decimals() as Promise<bigint>;
}

export function getErc20BalanceOf (network: Network, token: string, owner: string) {
    return InitErc20Contract(network, token).balanceOf(owner) as Promise<bigint>;
}

export function getErc20Allowance (network: Network, token: string, owner: string) {
    return InitErc20Contract(network, token).allowance(owner, network.contract) as Promise<bigint>;
}

export async function createErc20ApproveTx (network: Network, token: string, owner: string) {
    const contract = InitErc20Contract(network, token);
    return await contract.approve.populateTransaction(network.contract, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), { from: owner });
}

// Subscribe contract

export function getProvider (network: Network) {
    return new ethers.JsonRpcProvider(network.rpc);
}

export function getBlockNumber (network: Network) {
    const provider = new ethers.JsonRpcProvider(network.rpc);
    return provider.getBlockNumber();
}

export function getExecutorCommission (network: Network, token: string) {
    return InitContract(network).executorCommissions(token) as Promise<bigint>;
}

export function getServiceCommission (network: Network, token: string) {
    return InitContract(network).serviceCommissions(token) as Promise<[bigint, bigint, bigint, bigint] & {
        min: bigint;
        max: bigint;
        percent: bigint;
        percentDiv: bigint;
    }>;
}

export function getCounter (network: Network, owner: string) {
    return InitContract(network).counter(owner) as Promise<[bigint, bigint] & {
        outcomes: bigint;
        incomes: bigint;
    }>;
}

export function getOutcomes (network: Network, owner: string, index: string | number) {
    return InitContract(network).outcomes(owner, index) as Promise<bigint>;
}

export function getIncomes (network: Network, owner: string, index: string | number) {
    return InitContract(network).incomes(owner, index) as Promise<bigint>;
}

export type Order = {
    spender: string;
    spenderLinkIndex: bigint;
    receiver: string;
    receiverLinkIndex: bigint;
    token: string;
    amount: bigint;
    period: bigint;
    nextTime: bigint;
    memo: string;
    createdAt: bigint;
    cancelledAt: bigint;
}

export type OrderWithToken = Order & {
    id: bigint
    isMissed: boolean
    isSuccess?: boolean
    tokenInfo: {
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
    }
}

export function getOrder (network: Network, orderId: string) {
    return InitContract(network).orders(orderId) as Promise<Order>;
}

export async function createSubscribeTx (network: Network, opts: {
    spender: string
    receiver: string
    token: string
    amount: string
    period: string
    startsAt: string
    memo: string
}) {
    const contract = InitContract(network);
    return await contract.Subscribe.populateTransaction(
        opts.receiver,
        opts.token,
        opts.amount,
        opts.period,
        opts.startsAt,
        opts.memo,
        { from: opts.spender }
    );
}

export async function createExecuteTx (network: Network, orderId: bigint, account: string) {
    const contract = InitContract(network);
    return await contract.Execute.populateTransaction(
        orderId,
        { from: account }
    );
}

export async function createCancelTx (network: Network, orderId: bigint, account: string) {
    const contract = InitContract(network);
    return await contract.Cancel.populateTransaction(
        orderId,
        { from: account }
    );
}

// Utils

export function calcServiceFee (amount: BigNumber | bigint | string, opts: { min: BigNumber | bigint | string, max: BigNumber | bigint | string, percent: BigNumber | bigint | string, div: BigNumber | bigint | string }) {
    if (typeof amount === 'bigint') amount = amount.toString();
    if (typeof opts.min === 'bigint') opts.min = opts.min.toString();
    opts.min = new BigNumber(opts.min);
    if (typeof opts.max === 'bigint') opts.max = opts.max.toString();
    opts.max = new BigNumber(opts.max);
    if (typeof opts.percent === 'bigint') opts.percent = opts.percent.toString();
    opts.percent = new BigNumber(opts.percent);
    if (typeof opts.div === 'bigint') opts.div = opts.div.toString();
    opts.div = new BigNumber(opts.div);

    if (opts.div.isZero()) return new BigNumber(0);

    let res = new BigNumber(amount).times(opts.percent).div(opts.div);
    if (res.lt(opts.min)) {
        return opts.min;
    } else if (res.gt(opts.max)) {
        return opts.max;
    }
    
    return new BigNumber(res.toFixed(0));
}

// Ethers methods

export function waitForTransaction (network: Network, txHash: string) {
    const provider = new ethers.JsonRpcProvider(network.rpc);
    return provider.waitForTransaction(txHash, 3);
}