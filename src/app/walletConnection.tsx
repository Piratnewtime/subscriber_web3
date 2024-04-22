'use client';

import { DropdownBtn, DropdownSelect } from "./ui";
import { WalletContext } from "./wallet";
import { Box, Stack } from "@mui/material";

import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';

import stylesUi from './ui.module.css';
import networks from "./networks";
import ScaleHandler from "./scaleHandler";
import { ReactNode } from "react";

export default function WalletConnection () {
    const walletContext = WalletContext();
    const screen = ScaleHandler();

    const SelectNetwork = <DropdownSelect onSelect={walletContext.setChainId} activeValue={walletContext.chainId} select={
        networks.map(item => {
            return {
                icon: item.icon,
                text: item.name,
                value: item.chainId
            }
        })
    } align='right' />

    let SelectAccount: ReactNode = <></>;
    if (walletContext.wallet && walletContext.wallet.accounts.length) {
        const { address } = walletContext.wallet.accounts[0];
        SelectAccount = <DropdownSelect 
            onSelect={(key: string) => {
                if (key === 'disconnect') {
                    walletContext.disconnect();
                }
            }} 
            placeholder={<Stack direction='row' gap='10px' alignItems='center'><span className={stylesUi.icon} style={{ backgroundImage: `url(data:image/svg+xml;utf8,${encodeURIComponent(walletContext.wallet.icon)})` }}></span><span>{address.slice(0, 8) + '...' + address.slice(-8)}</span></Stack>} 
            activeValue={'wallet_' + address} 
            select={[
                // {
                //     text: 'Change account',
                //     value: 'reconnect'
                // },
                {
                    text: 'Disconnect',
                    value: 'disconnect'
                }
            ]}
            align={screen.isMobile ? 'right' : 'left'}
        />
    } else {
        SelectAccount = <DropdownBtn
            onClick={walletContext.setProvider} 
            placeholder={<Stack direction='row' gap='10px' alignItems='center'><AccountBalanceWalletRoundedIcon /><span>Connect wallet</span></Stack>}
        />
    }

    if (screen.isMobile) {
        return <Stack direction='column' alignItems='center' gap='10px' style={{ margin: '40px 0px' }}>
            {SelectNetwork}
            {SelectAccount}
        </Stack>
    }

    return <Box style={{ margin: '40px 0px', height: '40px' }}>
        <Box style={{ right: 'calc(50% + 10px)', display: 'inline-block', position: 'absolute' }}>
            {SelectNetwork}
        </Box>
        <Box style={{ left: 'calc(50% + 10px)', display: 'inline-block', position: 'absolute' }}>
            {SelectAccount}
        </Box>
    </Box>;
}