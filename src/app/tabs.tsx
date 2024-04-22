'use client';

import { Box, Stack } from "@mui/material";
import MenuSharpIcon from '@mui/icons-material/MenuSharp';
import styles from './tabs.module.css';
import ScaleHandler from "./scaleHandler";
import { useEffect, useState } from "react";

type TabsProps = {
    active: string
    setTab: (value: string) => void
}

export default function Tabs (props: TabsProps) {
    const [ openSelector, setOpenSelector ] = useState<boolean>(false);
    const screen = ScaleHandler();

    useEffect(() => {
        if (openSelector && !screen.isMobile) {
            setOpenSelector(false);
        }
    }, [openSelector, screen])

    const tabs = [
        [ 'payments', 'Payments' ],
        [ 'incomingPayments', 'Incoming payments' ],
        [ 'earn', 'Earn' ]
    ];

    if (screen.isMobile) {
        const activeTab = tabs.find(([ key ]) => key === props.active);
        if (activeTab && !openSelector) {
            return <div className={styles.tab} onClick={() => setOpenSelector(true)}>
                <Stack direction='row' justifyContent='flex-start' gap='10px' alignItems='center' style={{ width: '100%', padding: '0px 20px' }}>
                    <MenuSharpIcon />
                    <span>{activeTab[1]}</span>
                </Stack>
            </div>
        }
        return <Stack direction='column' justifyContent='space-between' gap='10px' className={styles.tabs}>
            { activeTab ? <MobileTab active={true} onClick={() => { setOpenSelector(false); props.setTab(activeTab[0]); }}>{activeTab[1]}</MobileTab> : '' }
            {
                tabs.filter(([ key ]) => key !== activeTab?.[0]).map(([ key, label ], index) => {
                    return <MobileTab key={'tab_' + index} active={props.active === key} onClick={() => { setOpenSelector(false); props.setTab(key); }}>{label}</MobileTab>
                })
            }
        </Stack>
    }
    
    return <Stack direction={screen.isMobile ? 'column' : 'row'} justifyContent='space-between' gap={screen.isMobile ? '10px' : '35px'} className={styles.tabs}>
        {
            tabs.map(([ key, label ], index) => {
                return <Tab key={'tab_' + index} active={props.active === key} onClick={() => props.setTab(key)}>{label}</Tab>
            })
        }
    </Stack>;
}

function Tab (props: { active?: boolean, onClick: () => void, children: any }) {
    return <div onClick={props.onClick} className={styles.tab + ' ' + (props.active ? styles.active : '')}>{props.children}</div>;
}

function MobileTab (props: { active?: boolean, onClick: () => void, children: any }) {
    return <div onClick={props.onClick} className={styles.tab + ' ' + (props.active ? styles.active : '')} style={{ padding: '0px 20px', justifyContent: 'flex-start' }}>{props.children}</div>;
}