'use client';

import { DropdownSelect } from "./ui";
import { WalletContext } from "./wallet";
import { Box, Stack } from "@mui/material";

import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';

import stylesUi from './ui.module.css';
import networks from "./networks";
import providers from "./providers";

export default function WalletConnection () {
    const walletContext = WalletContext();

    return <Box style={{ margin: '40px 0px', height: '40px' }}>
        <Box style={{ right: 'calc(50% + 10px)', display: 'inline-block', position: 'absolute' }}>
            <DropdownSelect onSelect={walletContext.setChainId} activeValue={walletContext.chainId} select={
                networks.map(item => {
                    return {
                        icon: item.icon,
                        text: item.name,
                        value: item.chainId
                    }
                })
            } align='right' />
        </Box>
        {
            walletContext.account ?
                <Box style={{ left: 'calc(50% + 10px)', display: 'inline-block', position: 'absolute' }}>
                    <DropdownSelect 
                        onSelect={(key: string) => {
                            if (key === 'disconnect') {
                                walletContext.disconnect();
                            }
                        }} 
                        placeholder={<Stack direction='row' gap='10px' alignItems='center'><span className={stylesUi.icon} style={{ backgroundImage: `url(${providers.find(item => item.key === walletContext.providerKey)!.icon})` }}></span><span>{walletContext.account.slice(0, 8) + '...' + walletContext.account.slice(-8)}</span></Stack>} 
                        activeValue={'wallet_' + walletContext.account} 
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
                    />
                </Box>
            :
                <Box style={{ left: 'calc(50% + 10px)', display: 'inline-block', position: 'absolute' }}>
                    <DropdownSelect 
                        onSelect={walletContext.setProvider} 
                        placeholder={<Stack direction='row' gap='10px' alignItems='center'><AccountBalanceWalletRoundedIcon /><span>Connect wallet</span></Stack>} 
                        activeValue={walletContext.providerKey} 
                        select={
                            providers.map(item => {
                                const isInjected = new item.class().isInjected();
                                return {
                                    icon: item.icon,
                                    text: isInjected ? item.name : <>{item.name} <span style={{ color: '#630000', fontWeight: '300', fontSize: '10px', verticalAlign: 'middle' }}>NOT INSTALLED</span></>,
                                    value: item.key,
                                    disabled: !isInjected
                                }
                            })
                        }
                    />
                </Box>
        }
        
    </Box>;
}