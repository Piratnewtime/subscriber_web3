import { BaseContract, ContractEventPayload, EventFilter, JsonRpcProvider, Log, LogParams, Provider, TopicFilter, ethers } from "ethers";
import axios from "axios";

import { contractAbi } from "./contractAbi";
import { erc20Abi } from "./erc20Abi";
import { Network } from "./networks";
import BigNumber from "bignumber.js";

const providers = new Map<string, JsonRpcProvider>();

export function GetProviderInstance (rpc: string) {
    if (!providers.has(rpc)) {
        providers.set(rpc, new ethers.JsonRpcProvider(rpc));
    }
    return providers.get(rpc)!;
}

export function InitErc20Contract (network: Network, token: string) {
    const provider = GetProviderInstance(network.rpc);
    return new ethers.Contract(token, erc20Abi, provider);
}

export function InitContract (network: Network) {
    const provider = GetProviderInstance(network.rpc);
    return new ethers.Contract(network.contract, contractAbi, provider);
}

type RawLog = {
    address: string
    topics: string[]
    data: string
    blockNumber: string
    transactionHash: string
    transactionIndex: string
    blockHash: string
    logIndex: string
    removed: boolean
}

class EvmListener {
    private provider: Provider;
    private blockNumber: number = 0;
    private lagLimit = 5;
    private blockHandler: (blockNumber: number) => void;
    private id: string = '';
    private stopped: boolean = false;

    constructor (
        private network: Network,
        private contract: BaseContract,
        private topics: EventFilter | TopicFilter,
        private clb: (ev: ContractEventPayload) => void
    ) {
        this.provider = contract.runner!.provider!;
        this.blockHandler = (blockNumber: number) => {
            if (this.blockNumber && blockNumber - this.blockNumber < this.lagLimit) {
                this.next();
                return;
            }
            this.requestUpdate().then(() => {
                this.blockNumber = blockNumber;
                if (this.stopped) return;
                this.next();
            });
        };
        this.next();
    }

    getLagLimit() {
        return this.lagLimit;
    }

    setLagLimit(limit: number) {
        this.lagLimit = limit;
        return this;
    }

    createFilter() {
        return axios.post(this.network.rpc, {
            method: 'eth_newFilter',
            params: [
                {
                    fromBlock: this.blockNumber ? 'latest' : '0x' + this.blockNumber.toString(16),
                    toBlock: 'latest',
                    address: 'address' in this.topics ? this.topics.address : this.network.contract,
                    topics: 'address' in this.topics ? this.topics.topics : this.topics
                }
            ],
            id: 1,
            jsonrpc: '2.0'
        }).then(({ data: { result, error } }) => ({ result, error })) as Promise<{ result?: string, error?: { message: string, code: number } }>;
    }

    async getId() {
        if (this.id) return this.id;

        do {
            try {
                const { result, error } = await this.createFilter();
                if (this.stopped) return false;
                if (error) {
                    console.error('EvmListener node has a problem:', error);
                    this.stopped = true;
                    return false;
                }
                if (!result) {
                    console.error('EvmListener returned empty result');
                    this.stopped = true;
                    return false;
                }
                this.id = result;
            } catch (e) {
                if (this.stopped) return false;
                console.error('EvmListener start failed:', e);
                await new Promise(tick => setTimeout(tick, 1000));
                continue;
            }
            break;
        } while (true);

        return this.id;
    }

    async requestUpdate() {
        do {
            const id = await this.getId();
            if (!id) return;
            try {
                const result = await axios.post(this.network.rpc, {
                    //method: 'eth_getFilterLogs',
                    method: 'eth_getFilterChanges',
                    params: [ this.id ],
                    id: 1,
                    jsonrpc: '2.0'
                }).then(({ data: { result, error } }) => ({ result, error })) as { result?: RawLog[], error?: { message: string, code: number } };

                if (this.stopped) return;

                if (result.error) {
                    console.error('EvmListener update failed:', { id: this.id }, result.error);
                    this.id = '';
                    continue;
                }

                if (result.result) {
                    result.result.map(ev => {
                        const rawLog: LogParams = {
                            ...ev,
                            index: parseInt(ev.logIndex),
                            blockNumber: parseInt(ev.blockNumber),
                            transactionIndex: parseInt(ev.transactionIndex)
                        };
                        const log = new Log(rawLog, this.provider);
                        const event = this.contract.getEvent(log.topics[0]);
                        const payload = new ContractEventPayload(
                            this.contract,
                            null,
                            event.name,
                            event.getFragment(),
                            log
                        );
                        return payload;
                    }).forEach(this.clb);
                }

            } catch (error) {
                if (this.stopped) return;
                console.error('EvmListener update failed:', error);
                await new Promise(tick => setTimeout(tick, 1000));
                continue;
            }
            break;
        } while (true);
    }

    next() {
        this.stopped = false;
        this.provider.once('block', this.blockHandler);
    }

    async stop() {
        this.stopped = true;
        if (this.blockHandler) {
            await this.provider.off('block', this.blockHandler);
        }
        if (this.id) {
            console.log('EvmListener drop id:', this.id);
            await axios.post(this.network.rpc, {
                method: 'eth_uninstallFilter',
                params: [ this.id ],
                id: 1,
                jsonrpc: '2.0'
            }).catch(console.error);
            this.id = '';
        }
    }

}

export function ListenEvent (network: Network, contract: BaseContract, topics: EventFilter | TopicFilter, clb: (ev: ContractEventPayload) => void) {
    return new EvmListener(network, contract, topics, clb);
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
    return GetProviderInstance(network.rpc);
}

export function getBlockNumber (network: Network) {
    const provider = GetProviderInstance(network.rpc);
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