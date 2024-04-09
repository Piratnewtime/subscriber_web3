'use client';

import { useState, ReactNode, useEffect, useCallback } from 'react';
import LaunchIcon from '@mui/icons-material/Launch';
import DialogTemplate, { Button, DialogCommonProps, DialogFormBlock, Error, InputAmount, InputCalendar, InputString, Link, Select, TimeTable } from "./dialogTemplate";
import { Alert, Box, CircularProgress, LinearProgress, Stack, Tooltip } from '@mui/material';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
BigNumber.config({
    FORMAT: { prefix: '', decimalSeparator: '.', groupSeparator: '' }
});
import { WalletContext } from './wallet';
import networks from './networks';
import periods from './periods';
import { Order, OrderWithToken, calcServiceFee, createCancelTx, createErc20ApproveTx, createExecuteTx, createSubscribeTx, getErc20Allowance, getErc20BalanceOf, getErc20Decimals, getErc20Symbol, getExecutorCommission, getServiceCommission, waitForTransaction } from './contractInteractions';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import BackHandIcon from '@mui/icons-material/BackHand';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import { HistoryItem } from './ui';

export default function DialogHistoryInfo (props: DialogCommonProps & { historyItem: { order: OrderWithToken, item: HistoryItem } }) {
    const wallet = WalletContext();

    const { order, item } = props.historyItem;

    let title = 'Payment details';

    if (item.type === 'subscription' || item.type === 'cancellation') {
        title = 'Subscription details';
    }

    const blocks: ReactNode[] = [];

    blocks.push(<DialogFormBlock label='Order number'>
        <Box color='#B490EA' fontSize='20px' fontWeight='500'>#{order.id.toString()}</Box>
    </DialogFormBlock>);

    if (item.type === 'execution') {
        blocks.push(<DialogFormBlock label='Status'>
            <Box color='#49A600' fontSize='20px' fontWeight='500'>
                <Stack direction='row' alignItems='center' gap='5px'>
                    <CheckCircleRoundedIcon style={{ fontSize: '35px' }} />
                    <span>Approved</span>
                </Stack>
            </Box>
        </DialogFormBlock>);
    } else if (item.type === 'subscription' || item.type === 'cancellation') {
        blocks.push(<DialogFormBlock label='Status'>
            <Box color={ order.cancelledAt ? '#FF9900' : '#49A600' } fontSize='20px' fontWeight='500'>
                <Stack direction='row' alignItems='center' gap='5px'>
                    {
                    order.cancelledAt ? 
                        <>
                            <StopCircleRoundedIcon style={{ fontSize: '35px' }} />
                            <span>Inactive</span>
                        </>
                    :
                        <>
                            <PlayCircleOutlineIcon style={{ fontSize: '35px' }} />
                            <span>Active</span>
                        </>
                    }
                </Stack>
            </Box>
        </DialogFormBlock>);
        blocks.push(<DialogFormBlock label='Created at'>
            <TimeTable timestamp={order.createdAt.toString()} />
        </DialogFormBlock>);
        if (order.cancelledAt) {
            blocks.push(<DialogFormBlock label='Cancelled at'>
                <TimeTable timestamp={order.cancelledAt.toString()} variant='warning' />
            </DialogFormBlock>);
        }
    }

    if (wallet.account?.toLowerCase() === order.spender.toLowerCase()) {
        blocks.push(<DialogFormBlock label='Receiver'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '15px', fontWeight: 'bold' }}>{order.receiver}</div>
        </DialogFormBlock>);
    } else {
        blocks.push(<DialogFormBlock label='Sender'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '15px', fontWeight: 'bold' }}>{order.spender}</div>
        </DialogFormBlock>);
    }

    const { tokenInfo } = order;

    if (item.type === 'execution') {
        const processingFee = item.type === 'execution' ? new BigNumber(item.executorFee).div(tokenInfo.decimals ? 10 ** tokenInfo.decimals : 1) : new BigNumber('0');
        const serviceFee = item.type === 'execution' ? new BigNumber(item.serviceFee).div(tokenInfo.decimals ? 10 ** tokenInfo.decimals : 1) : new BigNumber('0');
        const totalFee = processingFee.plus(serviceFee);

        blocks.push(<DialogFormBlock label='Amount'>
            <Stack direction='column' gap='10px'>
                <Stack direction='row' justifyContent='flex-start' gap='15px'>
                    <span style={{
                        backgroundImage: `url(${tokenInfo.logo})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                        width: '60px'
                    }}></span>
                    <Stack direction='column' gap='5px'>
                        <Box color='#E199AA' fontSize='24px'>{periods.find(_ => _.seconds === parseInt(order.period.toString()))?.label ?? `Every ${order.period.toString()} seconds`}</Box>
                        <Box color='#E199AA' fontSize='24px' fontWeight='bold'>{new BigNumber(order.amount.toString()).div(10 ** tokenInfo.decimals).toString()} {tokenInfo.denom}</Box>
                    </Stack>
                </Stack>
                <hr style={{ border: 'unset', borderBottom: '2px solid rgba(180 144 234 / 60%)' }} />
                <Stack direction='row' justifyContent='space-between'>
                    <Box color='#B490EA' fontSize='15px' fontWeight='500'>{tokenInfo.name}</Box>
                    <Box color='#B490EA' fontSize='15px' fontWeight='500'>Fee: {totalFee.toString()} {tokenInfo.denom}</Box>
                </Stack>
            </Stack>
        </DialogFormBlock>);
    } else {
        blocks.push(<DialogFormBlock label='Amount'>
            <Stack direction='column' gap='10px'>
                <Stack direction='row' justifyContent='flex-start' gap='15px'>
                    <span style={{
                        backgroundImage: `url(${tokenInfo.logo})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                        width: '60px'
                    }}></span>
                    <Stack direction='column' gap='5px'>
                        <Box color='#B490EA' fontSize='15px' fontWeight='500'>{tokenInfo.name}</Box>
                        <Box color='#E199AA' fontSize='24px' fontWeight='bold'>{new BigNumber(order.amount.toString()).div(10 ** tokenInfo.decimals).toString()} {tokenInfo.denom}</Box>
                        <Box color='#B490EA' fontSize='15px' fontWeight='500'>{periods.find(_ => _.seconds === parseInt(order.period.toString()))?.label ?? `Every ${order.period.toString()} seconds`}</Box>
                    </Stack>
                </Stack>
            </Stack>
        </DialogFormBlock>);
    }

    if (order.memo) {
        blocks.push(<DialogFormBlock label='Memo'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '18px', fontWeight: 'bold' }}>{order.memo}</div>
        </DialogFormBlock>);
    }

    // if (isMissed) {
    //     blocks.push(<hr style={{ border: 'unset', borderBottom: '2px solid #B490EA', opacity: '0.6' }} />);
    // }

    blocks.push(<DialogFormBlock label='Transaction'>
        <Link href={wallet.network.links.tx + item.transactionHash}>{item.transactionHash.slice(0, 10) + '...' + item.transactionHash.slice(-10)} <LaunchIcon style={{ verticalAlign: 'middle', fontSize: '14px' }} /></Link>
    </DialogFormBlock>);

    return <DialogTemplate
        title={title}
        open={props.open}
        handleClose={props.handleClose}
        content={blocks}
    />
}