'use client';

import { useState, ReactNode, useEffect, useCallback } from 'react';
import LaunchIcon from '@mui/icons-material/Launch';
import DialogTemplate, { Button, DialogCommonProps, DialogFormBlock, Error, InputAmount, InputCalendar, InputString, Link, Select } from "./dialogTemplate";
import { Alert, Box, CircularProgress, LinearProgress, Stack, Tooltip } from '@mui/material';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
BigNumber.config({
    FORMAT: { prefix: '', decimalSeparator: '.', groupSeparator: '' }
});
import { WalletContext } from './wallet';
import networks from './networks';
import periods from './periods';
import { calcServiceFee, createErc20ApproveTx, createSubscribeTx, getErc20Allowance, getErc20BalanceOf, getErc20Decimals, getErc20Symbol, getExecutorCommission, getServiceCommission, waitForTransaction } from './contractInteractions';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';

export default function DialogNewInvoice (props: DialogCommonProps) {
    const wallet = WalletContext();
    const network = wallet.network;
    
    const [ token, setToken ] = useState<string>('');
    const [ customToken, setCustomToken ] = useState<string>('');
    const [ customTokenInfo, setCustomTokenInfo ] = useState<null | { decimals: number, denom: string }>(null);
    const [ isReqTokenInfo, setReqTokenInfo ] = useState<boolean>(false);
    const [ isCustomTokenIncorrect, setCustomTokenIncorrect ] = useState<boolean>(false);
    const [ amount, setAmount ] = useState<string>('');
    const [ fee, setFee ] = useState<null | { processing: string, service: string, total: string }>(null);
    const [ loadingCommissions, setLoadingCommissions ] = useState<boolean>(false);
    const [ commissions, setCommissions ] = useState<null | { processing: string, service: { min: bigint, max: bigint, percent: bigint, percentDiv: bigint } }>(null);
    const [ period, setPeriod ] = useState<string>(periods.find(_ => _.label === 'Monthly')!.seconds.toString());
    const [ startsAt, setStartsAt ] = useState<string>('now');
    const [ startsDatetime, setStartsDatetime ] = useState<string>('');
    const [ memo, setMemo ] = useState<string>('');
    const [ invoiceLink, setInvoiceLink ] = useState<string>();

    const verifyToken = !wallet.isInit ? null : token ? network.tokens.find(_ => _.contract === token) : network.tokens[0];
    const decimals = (customToken ? customTokenInfo?.decimals : verifyToken?.decimals) ?? 18;
    const denom = verifyToken?.denom ?? (customTokenInfo ? customTokenInfo.denom : '$TOKEN');

    const updateFee = (value: string) => {
        if (commissions === null) return;
        const serviceFee = commissions.service.percentDiv == BigInt(0) ? new BigNumber(0) : calcServiceFee(new BigNumber(value).times(10 ** decimals), {
            min: commissions.service.min,
            max: commissions.service.max,
            percent: commissions.service.percent,
            div: commissions.service.percentDiv
        });
        console.log('serviceFee', decimals, serviceFee)
        setFee({
            processing: new BigNumber(commissions.processing).div(10 ** decimals).toString(),
            service: serviceFee.div(10 ** decimals).toString(),
            total: serviceFee.plus(commissions.processing).div(10 ** decimals).toString()
        });
    };

    const updateToken = useCallback((value: string) => {
        if (isReqTokenInfo) return;
        setToken(value);
        if (value === '-') return;
        setCustomToken('');
        setCustomTokenInfo(null);
        setCustomTokenIncorrect(false);
    }, [isReqTokenInfo]);

    const updateCustomToken = useCallback((value: string) => {
        if (isReqTokenInfo) return;
        const addressIncorrect = !ethers.isAddress(value);
        setCustomTokenIncorrect(addressIncorrect);
        setCustomToken(value);
        setCustomTokenInfo(null);
        if (addressIncorrect) return;
        setReqTokenInfo(true);
        Promise.all([
            getErc20Symbol(network, value),
            getErc20Decimals(network, value)
        ]).then(([ denom, decimalsBn ]) => {
            const decimals = parseInt(decimalsBn.toString());
            setReqTokenInfo(false);
            setCustomTokenInfo({
                decimals,
                denom
            });
        }).catch(e => {
            console.error(e);
            setCustomTokenIncorrect(true);
            setReqTokenInfo(false);
        })
    }, [wallet, isReqTokenInfo]);
    
    useEffect(() => {
        if (!wallet.account) return;
        const tokenAddress = customToken || verifyToken?.contract;
        if (!tokenAddress) return;
        if (customToken && !customTokenInfo) return;
        setLoadingCommissions(true);
        setCommissions(null);
        setFee(null);
        Promise.all([
            getExecutorCommission(network, tokenAddress),
            getServiceCommission(network, tokenAddress),
            getErc20Allowance(network, tokenAddress, wallet.account),
            getErc20BalanceOf(network, tokenAddress, wallet.account)
        ]).then(([ processingBn, service, allowance, balance ]) => {
            const processing = processingBn.toString();
            setCommissions({
                processing,
                service
            });
            setLoadingCommissions(false);
            if (amount) {
                const serviceFee = service.percentDiv == BigInt(0) ? new BigNumber(0) : calcServiceFee(new BigNumber(amount).times(10 ** decimals), {
                    min: service.min,
                    max: service.max,
                    percent: service.percent,
                    div: service.percentDiv
                });
                setFee({
                    processing: new BigNumber(processing).div(10 ** decimals).toString(),
                    service: serviceFee.div(10 ** decimals).toString(),
                    total: serviceFee.plus(processing).div(10 ** decimals).toString()
                });
            }
        }).catch(e => {
            console.error(e);
            setLoadingCommissions(false);
        })
    }, [wallet, network, token, verifyToken, customTokenInfo]);
    
    const updateAmount = useCallback((value: string) => {
        if (value === '') {
            setAmount('');
            setFee(null);
            return;
        }
        if (value === '.') {
            setAmount('0.');
            setFee(null);
            return;
        }
        if (value.slice(-1) === '.') {
            if (value.split('.').length > 2) return;
            setAmount(value);
            return;
        }
        const bn = new BigNumber(value);
        if (bn.isNaN() || bn.lt(0)) return;
        const rightLength = Math.min(value.split('.')[1]?.length ?? 0, decimals);
        setAmount(bn.toFixed(rightLength));
        updateFee(bn.toFixed(rightLength));
    }, [decimals]);

    useEffect(() => {
        if (!props.open || !wallet.isInit) return;
        setToken(network.tokens[0].contract);
    }, [props.open, wallet])

    useEffect(() => {
        if (!invoiceLink) return;
        const reset = setTimeout(() => setInvoiceLink(undefined), 5000);
        return () => clearTimeout(reset);
    }, [invoiceLink]);

    const submit = async () => {
        if (!wallet.account || !wallet.provider) return;
        const tokenAddress = customToken || verifyToken?.contract;
        if (!tokenAddress) return;
        const delayedStart = startsAt === 'now' ? '' : startsDatetime;

        const invoice = {
            receiver: wallet.account,
            token: tokenAddress,
            amount,
            period,
            startsAt: delayedStart,
            memo
        };

        const encodedInvoice = Buffer.from(JSON.stringify(invoice)).toString('base64');

        const link = document.location.origin + '#invoice=' + encodedInvoice;

        window.navigator.clipboard.writeText(link);
        setInvoiceLink(link);
    };

    const blocks: ReactNode[] = [];

    blocks.push(<DialogFormBlock label='Receiver'>
        <InputString value={wallet.account ?? ''} readOnly={true} />
    </DialogFormBlock>);

    blocks.push(<DialogFormBlock label='Amount'>
        <Stack direction='column' gap='10px'>
            <Stack direction='row' gap='10px'>
                <div style={{ backgroundImage: `url(${verifyToken?.icon || '/tokens/unknown.webp'})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', width: '65px' }}></div>
                <Stack direction='column' gap='10px' style={{ flexGrow: 1 }}>
                    <div>
                        <Select
                            active={verifyToken ? verifyToken.contract : '-'}
                            list={[
                                ...network.tokens.map(token => {
                                    return {
                                        key: token.contract,
                                        value: token.name
                                    }
                                }),
                                { key: '-', value: 'Custom address' }
                            ]}
                            onSelect={updateToken}
                        />
                    </div>
                    <div>
                    {
                        verifyToken ?
                            <Link href={network.links.token + verifyToken.contract + (wallet.account ? '?a=' + wallet.account : '')}>Check the contract <LaunchIcon style={{ verticalAlign: 'middle', fontSize: '14px' }} /></Link>
                        :
                            <InputString onChange={updateCustomToken} />
                    }
                    </div>
                    { isReqTokenInfo ? <LinearProgress color="secondary" /> : '' }
                </Stack>
            </Stack>
            
            { isCustomTokenIncorrect ? <Error>Custom token is incorrect and token's data can't be fetched</Error> : '' }
            <Stack direction='row' justifyContent='space-between' gap='10px'>
                <Select
                    active={period}
                    list={periods.map(_ => {
                        return {
                            key: _.seconds.toString(),
                            value: _.label
                        }
                    })}
                    onSelect={setPeriod}
                />
                <InputAmount value={amount} onChange={updateAmount} denom={denom} />
            </Stack>
            { loadingCommissions ? <LinearProgress color="secondary" /> : '' }
            <Box
                display='flex'
                alignItems='center'
                gap='5px'
                position='absolute'
                right='0'
                bottom='-30px'
                color='#B490EA'
                zIndex='1'
            >
                Fee: {fee?.total ?? '0'} {denom}
                <Tooltip title={<><div>Processing fee: {fee?.processing ?? '0'} {denom}</div><div>Service fee: {fee?.service ?? '0'} {denom}</div></>} placement="bottom-end" arrow>
                    <HelpOutlineIcon style={{ fontSize: '15px' }} />
                </Tooltip>
            </Box>
        </Stack>
    </DialogFormBlock>);

    blocks.push(<DialogFormBlock label='Starts at'>
        <Stack direction='row' justifyContent='space-between' gap='10px'>
            <Select
                active={startsAt}
                list={[
                    { key: 'now', value: 'Now' },
                    { key: 'later', value: 'Later' }
                ]}
                onSelect={setStartsAt}
            />
            <InputCalendar value={startsDatetime} onChange={setStartsDatetime} readOnly={startsAt === 'now'} />
        </Stack>
    </DialogFormBlock>);

    blocks.push(<DialogFormBlock label='Memo' optional>
        <InputString value={memo} onChange={setMemo} />
    </DialogFormBlock>);

    if (token === '-') {
        blocks.push(<Alert severity="info">We will not process your own token automatically, but you can do it directly.</Alert>);
    }

    let disabledSubmit = !wallet.account || (token === '-' && !customTokenInfo) || amount == '' || new BigNumber(amount).isZero();

    if (invoiceLink) {
        blocks.push(<Alert severity="success">Invoice link has been copied to your clipboard <InventoryRoundedIcon style={{ fontSize: '18px', verticalAlign: 'top' }} /></Alert>);
    }

    return <DialogTemplate
        title='Create invoice'
        open={props.open}
        handleClose={props.handleClose}
        content={blocks}
        actions={<Button onClick={submit} disabled={disabledSubmit}>Copy an invoice link <ShareRoundedIcon style={{ fontSize: '18px', verticalAlign: 'bottom' }} /></Button>}
    />
}