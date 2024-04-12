'use client';

import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Divider, LinearProgress, Stack, TableContainer, Paper, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";

import { WalletContext } from "../wallet";
import { InitContract, waitForTransaction } from "../contractInteractions";
import BigNumber from "bignumber.js";
import DialogEditToken from "./dialogEditToken";

export default function Page() {
  const wallet = WalletContext();

  const [ error, setError ] = useState<string>();
  const [ isLoading, setLoading ] = useState<boolean>(false);
  const [ owner, setOwner ] = useState<string>('');
  const [ paused, setPaused ] = useState<boolean>();
  const [ executionBlockNumber, setExecutionBlockNumber ] = useState<string>();
  const [ orderId, setOrderId ] = useState<string>();
  const [ processingTokens, setProcessingTokens ] = useState<{ [token: string]: boolean }>();
  const [ executorCommissions, setExecutorCommissions ] = useState<{ [token: string]: bigint }>();
  const [ serviceCommissions, setServiceCommissions ] = useState<{ [token: string]: {
      min: bigint
      max: bigint
      percent: bigint
      percentDiv: bigint
    }
  }>();

  const [ editToken, setEditToken ] = useState<{
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
  }>();

  useEffect(() => {
    if (!wallet.isInit || !wallet.network || !wallet.account) return;

    (async () => {
      setLoading(true);
      const Contract = InitContract(wallet.network);
      const owner = (await Contract.owner()).toLowerCase();
      setOwner(owner);
      if (owner !== wallet.account?.toLowerCase()) return;

      setPaused(await Contract.paused());
      setExecutionBlockNumber((await Contract.executionBlockNumber()).toString());
      setOrderId((await Contract.orderId()).toString());

      const processingTokensResult: { [token: string]: boolean } = {};
      const executorCommissionsResult: { [token: string]: bigint } = {};
      const serviceCommissionsResult: { [token: string]: {
          min: bigint
          max: bigint
          percent: bigint
          percentDiv: bigint
        }
      } = {};
      for (const { contract } of wallet.network.tokens) {
        processingTokensResult[contract] = await Contract.processingTokens(contract);
        executorCommissionsResult[contract] = await Contract.executorCommissions(contract);
        const serviceFee = await Contract.serviceCommissions(contract) as [bigint, bigint, bigint, bigint] & {
          min: bigint
          max: bigint
          percent: bigint
          percentDiv: bigint
        };
        serviceCommissionsResult[contract] = {
          min: serviceFee.min,
          max: serviceFee.max,
          percent: serviceFee.percent,
          percentDiv: serviceFee.percentDiv
        }
      }
      setProcessingTokens(processingTokensResult);
      setExecutorCommissions(executorCommissionsResult);
      setServiceCommissions(serviceCommissionsResult);

    })().then(() => {
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setError(e.message);
      setLoading(false);
    });
  }, [wallet]);

  const pauseContract = useCallback(async (active: boolean) => {
    if (!wallet.isInit || !wallet.provider || isLoading) return;
    setLoading(true);
    const Contract = InitContract(wallet.network);
    try {
      const tx = await Contract[active ? 'pause' : 'unpause'].populateTransaction({ from: wallet.account });
      try {
          const txHash = await wallet.provider.signAndSend(tx);
          try {
              await waitForTransaction(wallet.network, txHash);
          } catch (txError) {
              console.error(txError);
          }
      } catch (signError) {
          console.error(signError);
      }
    } catch (buildError) {
      console.error(buildError);
    }
    setLoading(false);
  }, [wallet, isLoading]);
  
  return <main>
    { isLoading ? <Box margin='20px 0px'><LinearProgress color="secondary" /></Box> : '' }
    { error ? <Alert severity='error'>{error}</Alert> : '' }
    {
      !wallet.account || owner !== wallet.account.toLowerCase() ?
        'Only admin can view this page, sorry 🤷'
      :
        <Stack direction='column' divider={<Divider variant='fullWidth' style={{ borderColor: 'pink' }} />} gap='10px'>
          <Stack direction='row' gap='15px' alignItems='center'>
            <Box>Contract status:</Box>
            {
              typeof paused === 'undefined' ?
                '?'
              :
                !paused ?
                  <>
                    <Box color='green'>Active</Box>
                    <Button variant='contained' size='small' color='warning' onClick={() => pauseContract(true)}>Pause</Button>
                  </>
                :
                  <>
                    <Box color='orange'>Paused</Box>
                    <Button variant='contained' size='small' color='success' onClick={() => pauseContract(false)}>Resume</Button>
                  </>
            }
          </Stack>
          <Box>Execution block number: {executionBlockNumber ?? '?'}</Box>
          <Box>Orders: {orderId ? parseInt(orderId) - 1 : '?'}</Box>
          <TableContainer component={Paper}>
            <Table style={{ width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell><b>Logo</b></TableCell>
                  <TableCell><b>Contract</b></TableCell>
                  <TableCell><b>State</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  wallet.network.tokens.map(token => {
                    return <TableRow>
                      <TableCell>
                        <img src={token.icon} width='50px' />
                      </TableCell>
                      <TableCell>
                        <div><b>{token.name}</b></div>
                        <div><i>{token.contract}</i></div>
                        {
                          processingTokens && executorCommissions && serviceCommissions ?
                            <Button variant='contained' size='small' onClick={() => setEditToken({
                              name: token.name,
                              address: token.contract,
                              decimals: token.decimals,
                              denom: token.denom,
                              processingToken: processingTokens[token.contract],
                              executorCommission: executorCommissions[token.contract],
                              serviceCommission: serviceCommissions[token.contract]
                            })}>Manage</Button>
                          : ''
                        }
                      </TableCell>
                      <TableCell style={{ whiteSpace: 'nowrap' }}>
                        <Stack direction='column'>
                          {
                            processingTokens ?
                              processingTokens[token.contract] ?
                                <Box color='green' fontWeight='bold'>Active</Box>
                              :
                                <Box color='red' fontWeight='bold'>Inactive</Box>
                            :
                              <Box>Active?</Box>
                          }
                          <Box fontWeight='bold'>Processing fee: { executorCommissions ? new BigNumber(executorCommissions[token.contract].toString()).div(10 ** token.decimals).toString() : '?' }</Box>
                          <Stack direction='row' gap='5px'>
                            <Box fontWeight='bold'>Service fee:</Box>
                            {
                              serviceCommissions ?
                                <Stack direction='column'>
                                  <Box>Min: {new BigNumber(serviceCommissions[token.contract].min.toString()).div(10 ** token.decimals).toString()}</Box>
                                  <Box>Max: {new BigNumber(serviceCommissions[token.contract].max.toString()).div(10 ** token.decimals).toString()}</Box>
                                  <Box>Percent: {serviceCommissions[token.contract].percentDiv ? new BigNumber(serviceCommissions[token.contract].percent.toString()).times(100).div(serviceCommissions[token.contract].percentDiv.toString()).toString() : '0'}%</Box>
                                </Stack>
                              : '?'
                            }
                          </Stack>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
    }
    { editToken ? <DialogEditToken open={true} handleClose={() => setEditToken(undefined)} {...editToken} /> : '' }
  </main>;
}