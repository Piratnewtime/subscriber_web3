'use client';

export interface ProviderWrapper {
    isInjected(): boolean
    getAccounts(): Promise<string[]>
    getAccount(): Promise<string>
    //onChangeAccount(clb: (address: string | null) => void): void

    signAndSend(tx: { from?: string, to: string, data: string }): Promise<string>
}

class Metamask implements ProviderWrapper {

    isInjected() {
        return !!(globalThis.window as any)?.ethereum?.isMetaMask;
    }

    async getAccounts(): Promise<string[]> {
        return (globalThis.window as any)?.ethereum.request({ method: "eth_requestAccounts" });
    }

    async requestConnectedAccounts(): Promise<string[]> {
        return (globalThis.window as any)?.ethereum.request({ method: "eth_accounts" });
    }

    async getAccount() {
        const list = await this.requestConnectedAccounts();
        if (list.length) return list[0];
        const loadedAccounts = await this.getAccounts();
        if (!(loadedAccounts as string[]).length) throw new Error('Empty list of attached wallets');
        return loadedAccounts[0];
    }

    // onChangeAccount(clb: (address: string | null) => void): void {
    //     if (this.onChangeAccountClb)
    //     (window as any).ethereum.on("accountsChanged", () => {
    //         clb((window as any).ethereum.selectedAddress);
    //     });
    // }

    // await window.ethereum.request({
    //     "method": "wallet_requestPermissions",
    //     "params": [
    //       {
    //         "eth_accounts": {}
    //       }
    //     ]
    //   })

    // window.ethereum.selectedAddress
    // window.ethereum.networkVersion

    signAndSend(tx: { from?: string, to: string, data: string }) {
        return (globalThis.window as any)?.ethereum.request({
            method: "eth_sendTransaction",
            // The following sends an EIP-1559 transaction. Legacy transactions are also supported.
            params: [
                tx
            ],
        })
        .then((txHash: string) => txHash);
    }
}

const providers = [
    {
        key: 'metamask',
        name: 'MetaMask',
        icon: '/providers/metamask-fox.svg',
        class: Metamask
    }
] as const;

export default providers;