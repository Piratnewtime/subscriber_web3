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
import periods from './periods';
import { GetProviderInstance, calcServiceFee, createErc20ApproveTx, createSubscribeTx, getErc20Allowance, getErc20BalanceOf, getErc20Decimals, getErc20Symbol, getExecutorCommission, getServiceCommission, waitForTransaction } from './contractInteractions';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ScaleHandler from './scaleHandler';

export default function DialogNewPayment (props: DialogCommonProps) {
    const wallet = WalletContext();
    const network = wallet.network;
    const screen = ScaleHandler();
    
    const [ receiver, setReceiver ] = useState<string>('');
    const [ receiverCheck, setReceiverCheck ] = useState<{ text: string, color: string }>();
    const [ isReceiverIncorrect, setReceiverIncorrect ] = useState<boolean>(false);
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
    const [ allowance, setAllowance ] = useState<bigint>(BigInt(0));
    const [ balance, setBalance ] = useState<bigint>(BigInt(0));
    const [ isApproving, setApproving ] = useState<boolean>(false);
    const [ isSubscribing, setSubscribing ] = useState<boolean>(false);

    const verifyToken = !wallet.isInit ? null : token ? network.tokens.find(_ => _.contract === token) : network.tokens[0];
    const decimals = (customToken ? customTokenInfo?.decimals : verifyToken?.decimals) ?? 18;
    const denom = verifyToken?.denom ?? (customTokenInfo ? customTokenInfo.denom : '$TOKEN');

    const resetValues = useCallback(() => {
        setReceiver('');
        setAmount('');
        setFee(null);
        setStartsAt('now');
        setStartsDatetime('');
        setMemo('');
        setApproving(false);
        setSubscribing(false);
    }, []);

    const updateReceiver = useCallback(async (value: string) => {
        setReceiver(value);
        const isValid = value !== '' && ethers.isAddress(value);
        setReceiverIncorrect(value !== '' && !isValid);
        if (isValid) {
            const provider = GetProviderInstance(network.rpc);
            try {
                const [
                    code,
                    transactions
                ] = await Promise.all([
                    provider.getCode(value),
                    provider.getTransactionCount(value)
                ]);
                const isContract = !!code.replace('0x', '');
                if (isContract) {
                    setReceiverCheck({
                        text: 'This is an address of a contract!',
                        color: 'orange'
                    })
                    return;
                } else if (!transactions) {
                    setReceiverCheck({
                        text: 'This is an empty address',
                        color: 'orange'
                    })
                    return;
                } else {
                    setReceiverCheck({
                        text: 'Address exists and correct',
                        color: '#42cb42'
                    })
                    return;
                }
            } catch (e) {
                console.error(e);
                setReceiverCheck(undefined);
            }
        } else if (receiverCheck) {
            setReceiverCheck(undefined);
        }
    }, [network, receiverCheck]);

    const updateFee = useCallback((value: string) => {
        if (commissions === null) return;
        const serviceFee = commissions.service.percentDiv == BigInt(0) ? new BigNumber(0) : calcServiceFee(new BigNumber(value).times(10 ** decimals), {
            min: commissions.service.min,
            max: commissions.service.max,
            percent: commissions.service.percent,
            div: commissions.service.percentDiv
        });
        setFee({
            processing: new BigNumber(commissions.processing).div(10 ** decimals).toString(),
            service: serviceFee.div(10 ** decimals).toString(),
            total: serviceFee.plus(commissions.processing).div(10 ** decimals).toString()
        });
    }, [commissions]);

    const updateToken = useCallback((value: string) => {
        if (isReqTokenInfo || isSubscribing) return;
        setToken(value);
        setBalance(BigInt(0));
        if (value === '-') return;
        setCustomToken('');
        setCustomTokenInfo(null);
        setCustomTokenIncorrect(false);
    }, [isReqTokenInfo, isSubscribing]);

    const updateCustomToken = useCallback((value: string) => {
        if (isReqTokenInfo || isSubscribing) return;
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
    }, [wallet, isReqTokenInfo, isSubscribing]);
    
    useEffect(() => {
        if (!wallet.wallet?.accounts[0]) return;
        const tokenAddress = customToken || verifyToken?.contract;
        if (!tokenAddress) return;
        if (customToken && !customTokenInfo) return;
        setLoadingCommissions(true);
        setCommissions(null);
        setFee(null);
        setBalance(BigInt(0));
        Promise.all([
            getExecutorCommission(network, tokenAddress),
            getServiceCommission(network, tokenAddress),
            getErc20Allowance(network, tokenAddress, wallet.wallet.accounts[0].address),
            getErc20BalanceOf(network, tokenAddress, wallet.wallet.accounts[0].address)
        ]).then(([ processingBn, service, allowance, balance ]) => {
            const processing = processingBn.toString();
            setCommissions({
                processing,
                service
            });
            setAllowance(allowance);
            setBalance(balance);
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
    }, [updateFee, decimals]);

    useEffect(() => {
        if (!props.open || !wallet.isInit) return;
        setToken(network.tokens[0].contract);
    }, [props.open, wallet])

    useEffect(() => {
        if (!props.open || !wallet.isInit) {
            console.log('A', props.open, wallet.isInit);
            return;
        }
        console.log('B');
        if (!wallet.wallet?.accounts[0]) {
            wallet.setProvider();
            return;
        }
        if (!document.location.hash) return;
        const hash = document.location.hash.slice(1);
        const [ key, value ] = hash.split('=');
        if (key !== 'invoice') return;
        try {
            const data = JSON.parse(Buffer.from(value, 'base64').toString());
            updateReceiver(data.receiver);
            const token = wallet.network.tokens.find(_ => _.contract.toLowerCase() === data.token.toLowerCase());
            if (token) {
                updateToken(token.contract);
            } else {
                updateToken('-');
                updateCustomToken(data.token);
            }
            updateAmount(data.amount);
            setPeriod(data.period);
            if (data.startsAt) {
                setStartsAt('later');
                setStartsDatetime(data.startsAt);
            } else {
                setStartsAt('now');
                setStartsDatetime('');
            }
            setMemo(data.memo);
        } catch (e) {
            console.error(e);
        }
        document.location.hash = '';
    }, [props.open, wallet]);

    const approve = async () => {
        if (!wallet.wallet?.accounts[0]) return;
        const tokenAddress = customToken || verifyToken?.contract;
        if (!tokenAddress) return;
        setApproving(true);
        try {
            const tx = await createErc20ApproveTx(network, tokenAddress, wallet.wallet.accounts[0].address);
            try {
                const txHash = await wallet.sendTransaction(tx);
                if (txHash) {
                    try {
                        await waitForTransaction(network, txHash);
                        const newAllowance = await getErc20Allowance(network, tokenAddress, wallet.wallet.accounts[0].address);
                        console.log('New allowance', newAllowance);
                        setAllowance(newAllowance);
                    } catch (txError) {
                        console.error(txError);
                    }
                }
            } catch (signError) {
                console.error(signError);
            }
        } catch (buildError) {
            console.error(buildError);
        }
        setApproving(false);
    };

    const submit = async () => {
        if (isSubscribing || !wallet.wallet?.accounts[0]) return;
        const tokenAddress = customToken || verifyToken?.contract;
        if (!tokenAddress) return;
        const rawAmount = new BigNumber(amount).times(10 ** decimals).toFixed(0);
        const delayedStart = startsAt === 'now' ? '0' : startsDatetime ? (new Date(startsDatetime).getTime() / 1000).toFixed(0) : '0';

        setSubscribing(true);

        try {
            const tx = await createSubscribeTx(network, {
                spender: wallet.wallet.accounts[0].address,
                receiver,
                token: tokenAddress,
                amount: rawAmount,
                period,
                startsAt: delayedStart,
                memo
            });
            try {
                const txHash = await wallet.sendTransaction(tx);
                if (txHash) {
                    try {
                        await waitForTransaction(network, txHash);
                        // update list of subscriptions
                        // close modal
                        resetValues();
                        props.handleClose();
                    } catch (txError) {
                        console.error(txError);
                    }
                }
            } catch (signError) {
                console.error(signError);
            }
        } catch (buildError) {
            console.error(buildError);
        }

        setSubscribing(false);
    };

    const blocks: ReactNode[] = [];

    blocks.push(<DialogFormBlock label='Receiver'>
        <InputString value={receiver} onChange={updateReceiver} readOnly={isSubscribing} />
        { isReceiverIncorrect ? <Error>Incorrect address</Error> : '' }
        { receiverCheck ? <Box color={receiverCheck.color}>{receiverCheck.text}</Box> : '' }
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
                            <Link href={network.links.token + verifyToken.contract + (wallet.wallet?.accounts[0] ? '?a=' + wallet.wallet.accounts[0].address : '')}>Check the contract <LaunchIcon style={{ verticalAlign: 'middle', fontSize: '14px' }} /></Link>
                        :
                            <InputString value={customToken} onChange={updateCustomToken} readOnly={isSubscribing} />
                    }
                    </div>
                    { isReqTokenInfo ? <LinearProgress color="secondary" /> : '' }
                    <Box color='#B490EA'>
                        Balance: {new BigNumber(new BigNumber(balance.toString()).div(10 ** decimals).toFixed(4)).toString()} {denom}
                    </Box>
                </Stack>
            </Stack>
            
            { isCustomTokenIncorrect ? <Error>Custom token is incorrect and token's data can't be fetched</Error> : '' }
            <Stack direction={screen.isMobile ? 'column' : 'row'} justifyContent='space-between' gap='10px'>
                <Select
                    active={period}
                    list={periods.map(_ => {
                        return {
                            key: _.seconds.toString(),
                            value: _.label
                        }
                    })}
                    onSelect={(value: string) => !isSubscribing && setPeriod(value)}
                />
                <InputAmount value={amount} onChange={updateAmount} denom={denom} readOnly={isSubscribing} />
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
        <Stack direction={screen.isMobile ? 'column' : 'row'} justifyContent='space-between' gap='10px'>
            <Select
                active={startsAt}
                list={[
                    { key: 'now', value: 'Now' },
                    { key: 'later', value: 'Later' }
                ]}
                onSelect={(value: string) => {
                    if (isSubscribing) return;
                    setStartsAt(value);
                    if (value === 'now') setStartsDatetime('');
                }}
            />
            <InputCalendar value={startsDatetime} onChange={setStartsDatetime} readOnly={startsAt === 'now' || isSubscribing} />
        </Stack>
    </DialogFormBlock>);

    blocks.push(<DialogFormBlock label='Memo' optional>
        <InputString value={memo} onChange={setMemo} readOnly={isSubscribing} />
    </DialogFormBlock>);

    if (token === '-') {
        blocks.push(<Alert severity="info">We will not process your own token automatically, but you can do it directly.</Alert>);
    }

    const isEnoughAllowance = parseFloat(amount) > 0 ? new BigNumber(allowance.toString()).div(10 ** decimals).gte(amount) : true;

    let disabledSubmit = !wallet.wallet?.accounts[0] || !receiver || (token === '-' && !customTokenInfo) || amount == '' || new BigNumber(amount).isZero();

    if (!isEnoughAllowance) {
        disabledSubmit = true;
        blocks.push(<Alert severity="warning">Contract requires your allowance on spending a chosen token.</Alert>);
    }

    if (startsAt === 'now' && new BigNumber(balance.toString()).div(10 ** decimals).lt(new BigNumber(amount).plus(fee?.total ?? 0))) {
        disabledSubmit = true;
        blocks.push(<Alert severity="error">You don't have enough balance to execute your payment <b>now</b>.</Alert>);
    }

    if (receiver.toLowerCase() === wallet.wallet?.accounts[0]?.address.toLowerCase()) {
        disabledSubmit = true;
        blocks.push(<Alert severity="error">You cannot create a payment to yourself.</Alert>);
    }

    return <DialogTemplate
        title='New subscription'
        open={props.open}
        handleClose={props.handleClose}
        content={blocks}
        actions={
            isEnoughAllowance ?
                <Button onClick={submit} disabled={disabledSubmit || isSubscribing} loading={isSubscribing}>Submit</Button>
            :
                <Button onClick={approve} disabled={isApproving} loading={isApproving}>Approve</Button>
        }
    />
}