type Token = {
    contract: string
    name: string
    icon: string
    decimals: number
    denom: string
}

export type Network = {
    name: string
    chainId: string
    rpc: string
    icon: string
    denom: string
    tokens: Token[]
    links: {
        address: string
        tx: string
        token: string
    }
    contract: string
    deployBlock: number
    coingeckoId: string
}

const networks: Network[] = [
    {
        name: 'Ethereum',
        chainId: '1',
        rpc: 'https://eth.llamarpc.com',
        icon: '/networks/ethereum.png',
        denom: 'ETH',
        tokens: [
            {
                contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                name: 'Tether USD',
                denom: 'USDT',
                icon: '/tokens/usdt.png',
                decimals: 6
            },
            {
                contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                name: 'USDC',
                denom: 'USDC',
                icon: '/tokens/usdc.png',
                decimals: 6
            }
        ],
        links: {
            address: 'https://etherscan.io/address/',
            token: 'https://etherscan.io/token/',
            tx: 'https://etherscan.io/tx/'
        },
        contract: '',
        deployBlock: 0,
        coingeckoId: 'ethereum'
    },
    {
        name: 'Binance Smart Chain',
        chainId: '56',
        rpc: 'https://bsc-dataseed.bnbchain.org',// 'https://binance.llamarpc.com',
        icon: '/networks/bnb-bnb-logo.svg',
        denom: 'BNB',
        tokens: [
            {
                contract: '0x55d398326f99059ff775485246999027b3197955',
                name: 'Binance-Peg BSC-USD',
                denom: 'BSC-USD',
                icon: '/tokens/usdt.png',
                decimals: 18
            },
            {
                contract: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
                name: 'Binance-Peg USD Coin',
                denom: 'USDC',
                icon: '/tokens/usdc.png',
                decimals: 18
            }
        ],
        links: {
            address: 'https://bscscan.com/address/',
            token: 'https://bscscan.com/token/',
            tx: 'https://bscscan.com/tx/'
        },
        contract: '0xf245a4396e23a1fde5c95a099a079cc513d63aee',
        deployBlock: 37074005,
        coingeckoId: 'binancecoin'
    }
];

export default networks;