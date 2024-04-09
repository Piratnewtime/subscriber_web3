'use client';

import { useState, useCallback, ReactNode, CSSProperties, useRef, useEffect } from 'react';
import BigNumber from 'bignumber.js';

import styles from './ui.module.css';
import { Box, Divider, Stack } from '@mui/material';

import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ModeCommentIcon from '@mui/icons-material/ModeComment';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import SyncDisabledRoundedIcon from '@mui/icons-material/SyncDisabledRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import { Order, OrderWithToken } from './contractInteractions';
import { WalletContext } from './wallet';
import * as api from './api';

type DropdownSelectItem = {
    icon?: string
    text: string | ReactNode
    value?: string
    disabled?: boolean
};

export function DropdownSelect (props: {
    onSelect: (value: string) => void
    activeValue?: string
    placeholder?: string | ReactNode
    select: DropdownSelectItem[]
    align?: 'left' | 'right'
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [ isOpen, setOpen ] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;
        const clb = function(ev: MouseEvent) {
            if (!ev.target) return;
            if (ref.current!.contains(ev.target as Node)) return;
            
            setOpen(false);
        };
        document.addEventListener('click', clb);

        return () => document.removeEventListener('click', clb);
    }, [isOpen]);

    const openHandler = () => setOpen(!isOpen);
    const selectHandler = (value: string) => {
        setOpen(false);
        props.onSelect(value);
    };
    const activeSelect = props.activeValue ? props.select.find(item => (item.value ?? item.text) == props.activeValue) : null;

    return (
        <div ref={ref} className={`${styles.dropdownSelect} ${isOpen ? styles.open : ''}`}>
            <div className={styles.btn} onClick={openHandler}>
                <Stack direction='row' alignItems='center'>
                    {
                        activeSelect ?
                            <DropdownSelectItem {...activeSelect} />
                        : typeof props.placeholder === 'undefined' ?
                            'Select'
                        : typeof props.placeholder === 'string' ?
                            props.placeholder
                        :
                            props.placeholder
                    }
                    <ExpandMoreRoundedIcon className={styles.arrow} />
                </Stack>
                
            </div>
            <Stack className={styles.dropdown} style={{ right: props.align === 'right' ? 0 : undefined }}>
                {
                    props.select.map((el, i) => <DropdownSelectItem key={`dropdown_${i}`} {...el} selected={el === activeSelect} selectHandler={selectHandler} />)
                }
            </Stack>
        </div>
    )
}

function DropdownSelectItem (props: DropdownSelectItem & { selected?: boolean, selectHandler?: (value: string) => void }) {
    let classNames = '';
    if (props.selected) classNames += styles.selected;
    if (props.disabled) classNames += styles.disabled;
    const value = props.value ? props.value : typeof props.text === 'string' ? props.text : '';
    return <div onClick={() => !props.disabled && props.selectHandler && props.selectHandler(value)} className={classNames}><Stack direction='row' gap='10px' alignItems='center'>{props.icon ? <span className={styles.icon} style={{ backgroundImage: `url(${props.icon})` }}></span> : ''}<span>{props.text}</span></Stack></div>
}

type InnerButtonProps = {
    startsIcon?: ReactNode
    endsIcon?: ReactNode
    children: string | ReactNode
    onClick?: () => void
    variant?: 'default' | 'warning' | 'success' | 'subscription' | 'cancellation'
    style?: CSSProperties
}

export function InnerButton (props: InnerButtonProps) {
    return <div className={styles.innerButton + ' ' + (props.variant ? styles[props.variant] : '')} onClick={props.onClick} style={props.style}>
        <div className={ !props.startsIcon ? styles.hide : undefined}>{props.startsIcon}</div>
        <div>{props.children}</div>
        <div className={ !props.endsIcon ? styles.hide : undefined}>{props.endsIcon}</div>
    </div>;
}

export type HistoryItem = (
    ({ type: 'subscription' } & api.EventSubsctiprion) |
    ({ type: 'cancellation' } & api.EventCancellation) |
    ({ type: 'execution' } & api.EventExecution)
);

type PaymentItemProps = {
    // label?: string
    variant?: 'default' | 'warning' | 'success'
    direction: 'income' | 'outcome'
    order: OrderWithToken
    historyItem?: HistoryItem
    selectOrder?: (order: OrderWithToken) => void
}

export function PaymentItem (props: PaymentItemProps) {
    const icon = props.variant === 'warning' ? <WarningIcon style={{ fontSize: '26px' }} /> : props.variant === 'success' ? <CheckCircleIcon style={{ fontSize: '26px' }} /> : <AccessTimeFilledIcon style={{ fontSize: '26px' }} />
    const { order } = props;
    const { tokenInfo } = order;
    const amount = tokenInfo.decimals ? new BigNumber(order.amount.toString()).div(10 ** tokenInfo.decimals).toString() : props.order.amount.toString();
    
    if (props.historyItem) {
        if (props.historyItem.type === 'subscription') {
            const type = props.direction === 'income' ? 'New subscriber' : 'New payment';
            const startsIcon = props.direction === 'income' ? <ReceiptRoundedIcon /> : <CurrencyExchangeRoundedIcon />;
            return <InnerButton onClick={() => props.selectOrder?.(props.order)} variant='default' startsIcon={startsIcon} endsIcon={<InfoRoundedIcon />}>
                <Stack direction='column'>
                    <div className={styles.amount}>{type}{props.order.memo ? <> &bull; {props.order.memo}</> : ''}</div>
                    <div className={styles.address}>{amount} {tokenInfo.denom} {props.direction === 'income' ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />} {props.direction === 'income' ? props.order.spender : props.order.receiver}</div>
                </Stack>
            </InnerButton>
        }
        else if (props.historyItem.type === 'cancellation') {
            const type = 'Cancellation';
            const startsIcon = <SyncDisabledRoundedIcon />;
            return <InnerButton onClick={() => props.selectOrder?.(props.order)} variant='warning' startsIcon={startsIcon} endsIcon={<InfoRoundedIcon />}>
                <Stack direction='column'>
                    <div className={styles.amount}>{type}{props.order.memo ? <> &bull; {props.order.memo}</> : ''}</div>
                    <div className={styles.address}>{amount} {tokenInfo.denom} {props.direction === 'income' ? <ChevronLeftRoundedIcon /> : <ChevronRightRoundedIcon />} {props.direction === 'income' ? props.order.spender : props.order.receiver}</div>
                </Stack>
            </InnerButton>
        }
    }

    const logo = tokenInfo.logo ? <span className={styles.logo} style={{ backgroundImage: `url(${tokenInfo.logo})` }}></span> : '';

    return <InnerButton onClick={() => props.selectOrder?.(props.order)} variant={props.variant} startsIcon={logo} endsIcon={icon}>
        <Stack direction='column'>
            <div className={styles.amount}>{amount} {tokenInfo.denom}{props.order.memo ? <span>{props.order.memo}</span> : ''}</div>
            <div className={styles.address}>{props.direction === 'income' ? <ChevronLeftRoundedIcon style={{ marginLeft: '-7px' }} /> : <ChevronRightRoundedIcon style={{ marginLeft: '-7px' }} />} {props.direction === 'income' ? props.order.spender : props.order.receiver}</div>
        </Stack>
    </InnerButton>
}

export function ScheduleBlock (props: { date: string, direction: 'income' | 'outcome', orders: OrderWithToken[], selectOrder: (order: OrderWithToken) => void }) {
    return <div className={styles.scheduleBlock}>
        <Stack direction='column' gap='20px'>
            <div className={styles.date}>{props.date}</div>
            {props.orders.map((order, i) => <PaymentItem key={`order_${i}`} direction={props.direction} variant={order.isSuccess ? 'success' : order.isMissed ? 'warning' : 'default'} order={order} selectOrder={props.selectOrder} />)}
        </Stack>
    </div>
}

export function ScheduleHistoryBlock (props: { date: string, direction: 'income' | 'outcome', history: { item: HistoryItem, order: OrderWithToken }[], selectOrder: (historyItem: { order: OrderWithToken, item: HistoryItem }) => void }) {
    return <div className={styles.scheduleBlock}>
        <Stack direction='column' gap='20px'>
            <div className={styles.date}>{props.date}</div>
            {props.history.map(({ item, order }, i) => <PaymentItem key={`order_${i}`} direction={props.direction} variant={'success'} historyItem={item} order={order} selectOrder={() => props.selectOrder({ order, item })} />)}
        </Stack>
    </div>
}