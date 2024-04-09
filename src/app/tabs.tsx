'use client';

import { Box, Stack } from "@mui/material";
import styles from './tabs.module.css';

type TabsProps = {
    active: string
    setTab: (value: string) => void
}

export default function Tabs (props: TabsProps) {
    return <Stack direction='row' justifyContent='space-between' gap='35px' className={styles.tabs}>
        <Tab active={props.active === 'payments'} onClick={() => props.setTab('payments')}>Payments</Tab>
        <Tab active={props.active === 'incomingPayments'} onClick={() => props.setTab('incomingPayments')}>Incoming payments</Tab>
        <Tab active={props.active === 'earn'} onClick={() => props.setTab('earn')}>Earn</Tab>
    </Stack>;
}

function Tab (props: { active?: boolean, onClick: () => void, children: any }) {
    return <div onClick={props.onClick} className={styles.tab + ' ' + (props.active ? styles.active : '')}>{props.children}</div>;
}