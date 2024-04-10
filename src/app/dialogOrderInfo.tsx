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
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import ScaleHandler from './scaleHandler';

export default function DialogOrderInfo (props: DialogCommonProps & { order: OrderWithToken }) {
    const wallet = WalletContext();
    const screen = ScaleHandler();
    const [ isProcessing, setProcessing ] = useState<boolean>(false);
    const [ allowance, setAllowance ] = useState<bigint>();
    const [ balance, setBalance ] = useState<bigint>();

    const isMissed = props.order.isMissed;

    useEffect(() => {
        if (!isMissed) return;
        (async () => {
            const allowance = await getErc20Allowance(wallet.network, props.order.token, props.order.spender);
            setAllowance(allowance);
            if (allowance < props.order.amount) return;
            const balance = await getErc20BalanceOf(wallet.network, props.order.token, props.order.spender);
            setBalance(balance);
        })().catch(console.error)
        
        return () => {
            setAllowance(undefined);
            setBalance(undefined);
        }
    }, [props.order, isMissed]);

    const approve = async () => {
        setProcessing(true);
        try {
            const tx = await createErc20ApproveTx(wallet.network, props.order.token, wallet.account!);
            try {
                const txHash = await wallet.provider!.signAndSend(tx);
                try {
                    await waitForTransaction(wallet.network, txHash);
                    const newAllowance = await getErc20Allowance(wallet.network, props.order.token, wallet.account!);
                    console.log('New allowance', newAllowance);
                    setAllowance(newAllowance);
                } catch (txError) {
                    console.error(txError);
                }
            } catch (signError) {
                console.error(signError);
            }
        } catch (buildError) {
            console.error(buildError);
        }
        setProcessing(false);
    };

    const execute = async () => {
        setProcessing(true);
        try {
            const tx = await createExecuteTx(wallet.network, props.order.id, wallet.account!);
            try {
                const txHash = await wallet.provider!.signAndSend(tx);
                try {
                    await waitForTransaction(wallet.network, txHash);
                    props.handleClose();
                } catch (txError) {
                    console.error(txError);
                }
            } catch (signError) {
                console.error(signError);
            }
        } catch (buildError) {
            console.error(buildError);
        }
        setProcessing(false);
    }

    const cancel = async () => {
        setProcessing(true);
        try {
            const tx = await createCancelTx(wallet.network, props.order.id, wallet.account!);
            try {
                const txHash = await wallet.provider!.signAndSend(tx);
                try {
                    await waitForTransaction(wallet.network, txHash);
                    props.handleClose();
                } catch (txError) {
                    console.error(txError);
                }
            } catch (signError) {
                console.error(signError);
            }
        } catch (buildError) {
            console.error(buildError);
        }
        setProcessing(false);
    };

    const blocks: ReactNode[] = [];

    if (isMissed) {
        blocks.push(<DialogFormBlock label='Status'>
            <Box color='#FF9900' fontSize='20px' fontWeight='500'>
                <Stack direction='row' alignItems='center' gap='5px'>
                    <WarningRoundedIcon style={{ fontSize: '35px' }} />
                    <span>Need an action!</span>
                </Stack>
            </Box>
        </DialogFormBlock>);
    }

    if (wallet.account?.toLowerCase() === props.order.spender.toLowerCase()) {
        blocks.push(<DialogFormBlock label='Receiver'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '15px', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{props.order.receiver}</div>
        </DialogFormBlock>);
    } else {
        blocks.push(<DialogFormBlock label='Sender'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '15px', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{props.order.spender}</div>
        </DialogFormBlock>);
    }

    const { tokenInfo } = props.order;
    const processingFee = new BigNumber(tokenInfo.processingFee.toString()).div(tokenInfo.decimals ? 10 ** tokenInfo.decimals : 1);
    const serviceFee = calcServiceFee(props.order.amount, tokenInfo.serviceFee).div(tokenInfo.decimals ? 10 ** tokenInfo.decimals : 1);
    const totalFee = processingFee.plus(serviceFee);
    
    const totalAmount = BigInt(totalFee.times(10 ** props.order.tokenInfo.decimals).plus(props.order.amount.toString()).toFixed(0));
    
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
                    <Box color='#E199AA' fontSize='24px'>{periods.find(_ => _.seconds === parseInt(props.order.period.toString()))?.label ?? `Every ${props.order.period.toString()} seconds`}</Box>
                    <Box color='#E199AA' fontSize='24px' fontWeight='bold'>{new BigNumber(props.order.amount.toString()).div(10 ** tokenInfo.decimals).toString()} {tokenInfo.denom}</Box>
                </Stack>
            </Stack>
            <hr style={{ border: 'unset', borderBottom: '2px solid rgba(180 144 234 / 60%)' }} />
            <Stack direction={screen.isMobile ? 'column' : 'row'} justifyContent='space-between'>
                <Box color='#B490EA' fontSize='15px' fontWeight='500'>{tokenInfo.name}</Box>
                <Box color='#B490EA' fontSize='15px' fontWeight='500'>Fee: {totalFee.toString()} {tokenInfo.denom}</Box>
            </Stack>
        </Stack>
    </DialogFormBlock>);

    if (isMissed) {
        blocks.push(<DialogFormBlock label='Missed date'>
            <TimeTable timestamp={props.order.nextTime.toString()} variant='warning' />
        </DialogFormBlock>);
    } else {
        blocks.push(<DialogFormBlock label='Next payment'>
            <TimeTable timestamp={props.order.nextTime.toString()} />
        </DialogFormBlock>);
    }

    if (props.order.memo) {
        blocks.push(<DialogFormBlock label='Memo'>
            <div style={{ color: 'rgba(225 153 170 / 100%)', fontSize: '18px', fontWeight: 'bold', overflowWrap: 'anywhere' }}>{props.order.memo}</div>
        </DialogFormBlock>);
    }

    if (isMissed) {
        blocks.push(<hr style={{ border: 'unset', borderBottom: '2px solid #B490EA', opacity: '0.6' }} />);
        blocks.push(<Stack direction='column' gap='10px'>
            <ItemCheck ok={allowance === undefined ? undefined : allowance >= totalAmount}>Allowance{ allowance !== undefined && allowance < totalAmount ? ': ' + new BigNumber(allowance.toString()).div(10 ** tokenInfo.decimals).toString() + ' ' + tokenInfo.denom : '' }</ItemCheck>
            <ItemCheck ok={balance === undefined ? undefined : balance >= totalAmount}>Balance{ balance !== undefined && balance < totalAmount ? <>: {new BigNumber(balance.toString()).div(10 ** tokenInfo.decimals).toString()} {tokenInfo.denom} <Box color='red'>({new BigNumber((balance - totalAmount).toString()).div(10 ** tokenInfo.decimals).toString()} {tokenInfo.denom})</Box></> : '' }</ItemCheck>
            <ItemCheck ok={balance !== undefined && balance >= totalAmount ? false : undefined}>Processing</ItemCheck>
        </Stack>);
    }

    return <DialogTemplate
        title='Subscription details'
        open={props.open}
        handleClose={props.handleClose}
        content={blocks}
        actions={<>
            { isMissed && allowance !== undefined && allowance < totalAmount && wallet.account?.toLowerCase() == props.order.spender.toLowerCase() ? <Button onClick={approve} disabled={isProcessing} loading={isProcessing}><CurrencyExchangeRoundedIcon style={{ fontSize: '20px', verticalAlign: 'bottom' }} /> Approve funds</Button> : '' }
            { isMissed && balance !== undefined && balance >= totalAmount ? <Button onClick={execute} disabled={isProcessing} loading={isProcessing}><PlayCircleOutlineIcon style={{ fontSize: '20px', verticalAlign: 'bottom' }} /> Execute payment</Button> : '' }
            { props.order.cancelledAt === BigInt(0) ? <Button variant='red' onClick={cancel} disabled={isProcessing} loading={isProcessing}><BackHandIcon style={{ fontSize: '20px', verticalAlign: 'bottom' }} /> Stop this subscription</Button> : '' }
        </>}
    />
}

function ItemCheck (props: { ok?: boolean, children: ReactNode }) {
    return <Stack direction='row' alignItems='center' gap='10px' style={{ color: props.ok === undefined ? undefined : props.ok ? '#49A600' : '#FF9900' }}>
        {
            props.ok === undefined ?
                <RadioButtonUncheckedRoundedIcon />
            :
            props.ok ?
                <CheckCircleRoundedIcon />
            :
                <WarningRoundedIcon />
        }
        {props.children}
    </Stack>;
}