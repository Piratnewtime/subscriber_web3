'use client';

import { useState, ReactNode, useEffect, useCallback } from 'react';
import LaunchIcon from '@mui/icons-material/Launch';
import DialogTemplate, { DialogCommonProps, DialogFormBlock, Error, InputAmount, InputCalendar, InputString, Link, Select, TimeTable } from "../dialogTemplate";
import { Alert, Box, Button, CircularProgress, LinearProgress, Stack, Tooltip } from '@mui/material';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
BigNumber.config({
    FORMAT: { prefix: '', decimalSeparator: '.', groupSeparator: '' }
});
import { WalletContext } from '../wallet';
import networks from '../networks';
import periods from '../periods';
import { InitContract, Order, OrderWithToken, calcServiceFee, createCancelTx, createErc20ApproveTx, createExecuteTx, createSubscribeTx, getErc20Allowance, getErc20BalanceOf, getErc20Decimals, getErc20Symbol, getExecutorCommission, getServiceCommission, waitForTransaction } from '../contractInteractions';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import BackHandIcon from '@mui/icons-material/BackHand';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';

export type TokenEditProps = {
  name: string
  address: string
  decimals: number
  denom: string
  processingToken: boolean
  executorCommission: bigint
  serviceCommission: {
    min: bigint
    max: bigint
    percent: bigint
    percentDiv: bigint
  }
}

export default function DialogEditToken (props: DialogCommonProps & TokenEditProps) {
  const wallet = WalletContext();

  const [ isSavingActive, setSavingActive ] = useState<boolean>(false);

  const [ executorFee, setExecutorFee ] = useState<string>();
  const [ isSavingExecutorFee, setSavingExecutorFee ] = useState<boolean>(false);

  const [ serviceFeeMin, setServiceFeeMin ] = useState<string>();
  const [ serviceFeeMax, setServiceFeeMax ] = useState<string>();
  const [ serviceFeePercent, setServiceFeePercent ] = useState<string>();
  const [ isSavingServiceFee, setSavingServiceFee ] = useState<boolean>(false);

  const saveActiveStatus = useCallback(async (active: boolean) => {
    if (!wallet.isInit || !wallet.wallet?.accounts[0]?.address || isSavingActive) return;
    setSavingActive(true);
    const Contract = InitContract(wallet.network);
    try {
      const tx = await Contract.setProcessingToken.populateTransaction(props.address, active, { from: wallet.wallet.accounts[0].address });
      try {
        const txHash = await wallet.sendTransaction(tx);
        if (txHash) {
          try {
            await waitForTransaction(wallet.network, txHash);
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
    setSavingActive(false);
  }, [wallet, props.address, isSavingActive]);

  const updateAmount = useCallback((stateFn: (_: string) => void, value: string) => {
    if (value === '') {
      stateFn('');
      return;
    }
    if (value === '.') {
      stateFn('0.');
      return;
    }
    if (value.slice(-1) === '.') {
      if (value.split('.').length > 2) return;
      stateFn(value);
      return;
    }
    const bn = new BigNumber(value);
    if (bn.isNaN() || bn.lt(0)) return;
    const rightLength = Math.min(value.split('.')[1]?.length ?? 0, props.decimals);
    stateFn(bn.toFixed(rightLength));
  }, [props.decimals]);

  const saveExecutorFee = useCallback(async () => {
    if (!wallet.isInit || !wallet.wallet?.accounts[0]?.address || isSavingExecutorFee || !executorFee) return;
    setSavingExecutorFee(true);
    const Contract = InitContract(wallet.network);
    try {
      const value = new BigNumber(executorFee).times(10 ** props.decimals).toFixed(0);
      const tx = await Contract.setExecutorCommissions.populateTransaction(props.address, value, { from: wallet.wallet.accounts[0].address });
      try {
        const txHash = await wallet.sendTransaction(tx);
        if (txHash) {
          try {
            await waitForTransaction(wallet.network, txHash);
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
    setSavingExecutorFee(false);
  }, [wallet, props.address, props.decimals, executorFee, isSavingExecutorFee]);

  const saveServiceFee = useCallback(async () => {
    if (!wallet.isInit || !wallet.wallet?.accounts[0]?.address || isSavingServiceFee || !serviceFeeMin || !serviceFeeMax || !serviceFeePercent) return;
    setSavingServiceFee(true);
    const Contract = InitContract(wallet.network);
    try {
      const min = new BigNumber(serviceFeeMin).times(10 ** props.decimals).toFixed(0);
      const max = new BigNumber(serviceFeeMax).times(10 ** props.decimals).toFixed(0);
      let percent = serviceFeePercent;
      let percentDiv = 100;
      if (serviceFeePercent.includes('.')) {
        const add = 10 ** serviceFeePercent.split('.')[1].length;
        percentDiv *= add;
        percent = new BigNumber(serviceFeePercent).times(add).toFixed(0);
      }

      const tx = await Contract.setServiceCommissions.populateTransaction(
        props.address,
        min,
        max,
        percent,
        percentDiv,
        { from: wallet.wallet.accounts[0].address }
      );
      try {
        const txHash = await wallet.sendTransaction(tx);
        if (txHash) {
          try {
            await waitForTransaction(wallet.network, txHash);
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
    setSavingServiceFee(false);
  }, [wallet, props.address, props.decimals, serviceFeeMin, serviceFeeMax, serviceFeePercent, isSavingServiceFee]);

  const blocks: ReactNode[] = [];

  blocks.push(<DialogFormBlock label='Name'>
    <Box color='#B490EA' fontSize='20px' fontWeight='500'>{props.name}</Box>
  </DialogFormBlock>);

  blocks.push(<DialogFormBlock label='Processing'>
    <Stack direction='row' alignItems='center' gap='20px'>
    {
      props.processingToken ?
        <>
          <Box color='green' fontSize='20px' fontWeight='500'>Active</Box>
          <Button
            variant='contained'
            size='small'
            color='error'
            onClick={() => saveActiveStatus(false)}
            disabled={isSavingActive}
          >Disable</Button>
        </>
      :
        <>
          <Box color='red' fontSize='20px' fontWeight='500'>Inactive</Box>
          <Button
            variant='contained'
            size='small'
            color='success'
            onClick={() => saveActiveStatus(true)}
            disabled={isSavingActive}
          >Enable</Button>
        </>
    }
    </Stack>
  </DialogFormBlock>);

  blocks.push(<DialogFormBlock label='Executor commission'>
    <Stack direction='row' alignItems='center' gap='20px'>
      <InputAmount
        value={executorFee ?? new BigNumber(props.executorCommission.toString()).div(10 ** props.decimals).toString()}
        denom={props.denom}
        onChange={(value: string) => updateAmount(setExecutorFee, value)}
        readOnly={isSavingExecutorFee}
      />
      { executorFee ? <Button variant='contained' color='success' disabled={isSavingExecutorFee} onClick={saveExecutorFee}>Save</Button> : '' }
    </Stack>
  </DialogFormBlock>);

  blocks.push(<DialogFormBlock label='Service commission'>
    <Stack direction='row' alignItems='center' gap='20px'>
      <InputAmount
        value={serviceFeeMin ?? new BigNumber(props.serviceCommission.min.toString()).div(10 ** props.decimals).toString()}
        denom={'Min'}
        onChange={(value: string) => updateAmount(setServiceFeeMin, value)}
        readOnly={isSavingServiceFee}
      />
      <InputAmount
        value={serviceFeePercent ?? new BigNumber(props.serviceCommission.percent.toString()).times(100).div(props.serviceCommission.percentDiv ? props.serviceCommission.percentDiv.toString() : 1).toString()}
        denom={'%'}
        onChange={(value: string) => updateAmount(setServiceFeePercent, value)}
        readOnly={isSavingServiceFee}
      />
      <InputAmount
        value={serviceFeeMax ?? new BigNumber(props.serviceCommission.max.toString()).div(10 ** props.decimals).toString()}
        denom={'Max'}
        onChange={(value: string) => updateAmount(setServiceFeeMax, value)}
        readOnly={isSavingServiceFee}
      />
    </Stack>
    <Button variant='contained' color='success' disabled={isSavingServiceFee} onClick={saveServiceFee}>Save</Button>
  </DialogFormBlock>);

  return <DialogTemplate
    title='Edit processing token'
    open={props.open}
    handleClose={props.handleClose}
    content={blocks}
  />
}