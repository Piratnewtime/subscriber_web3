'use client';

import { useState, ReactNode, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import { Box, CircularProgress, Stack } from '@mui/material';

import styles from './dialogTemplate.module.css';
import ScaleHandler from './scaleHandler';

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    backgroundColor: '#001215',
    color: 'white',
    border: '1px solid #B490EA',
    borderTopWidth: '4px',
    overflowY: 'unset',
    padding: '20px 35px',
    fontFamily: 'unset',
    width: '460px'
  },
  '& .MuiDialogTitle-root': {
    color: 'rgba(255 255 255 / 80%)',
    fontFamily: 'unset',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '24px',
    lineHeight: '45px',
    padding: 'unset'
  },
  '& .MuiDialogContent-root': {
    color: 'rgba(255 255 255 / 75%)',
    fontFamily: 'unset',
    padding: 'unset',
    // overflow: 'unset'
  },
  '& .MuiDialogActions-root': {
    padding: 0,
    marginTop: '20px',
    justifyContent: 'center'
  }
}));

export type DialogCommonProps = {
  open: boolean
  handleClose: () => void
}

type DialogTemplateProps = {
  title: string
  content: string | ReactNode
  actions?: ReactNode | ReactNode[]
} & DialogCommonProps

export default function DialogTemplate (props: DialogTemplateProps) {
  const screen = ScaleHandler();
  
  return <BootstrapDialog
    onClose={props.handleClose}
    open={props.open}
    scroll={screen.isMobile ? 'paper' : 'body'}
    fullScreen={screen.isMobile}
  >
    <DialogTitle sx={{ m: 0, p: 0 }}>{props.title}</DialogTitle>
    <IconButton
      aria-label="close"
      onClick={props.handleClose}
      sx={{
        position: 'absolute',
        right: (screen.isMobile ? 15 : -45),
        top: 22,
        background: '#B490EA',
        color: '#001215',
        padding: '3px',
        ':hover': {
          background: '#c4a0fa',
          color: '#001215'
        }
      }}
    >
      <HighlightOffIcon style={{ fontSize: '30px' }} />
    </IconButton>
    <DialogContent>
      <Stack direction='column' gap='20px'>
        {props.content}
      </Stack>
    </DialogContent>
    { props.actions ? <DialogActions sx={{ flexDirection: 'column', gap: '20px' }}>{props.actions}</DialogActions> : '' }
  </BootstrapDialog>;
}

type DialogFormBlockProps = {
  label: string
  optional?: boolean
  children: ReactNode
}

export function DialogFormBlock (props: DialogFormBlockProps) {
  return <Stack direction='column' gap='10px' style={{ position: 'relative' }}>
    <div className={styles.label}>{props.label}{props.optional ? <span className={styles.optional}>(optional)</span> : ''}</div>
    {props.children}
  </Stack>
}

type InputString = {
  readOnly?: boolean
  value?: string
  error?: string
  onChange?: (value: string) => void
}

export function InputString (props: InputString) {
  return <input className={styles.inputString} data-error={props.error} value={props.value} readOnly={props.readOnly} onChange={(e) => props.onChange?.(e.target.value)} />
}

export function Error ({ children }: { children: string | ReactNode }) {
  if (!children) return <></>
  return <div className={styles.error}><NotificationImportantIcon /> {children}</div>
}

type SelectProps = {
  placeholder?: string
  active?: string
  list: {
    key: string
    value: string
  }[]
  onSelect?: (value: string) => void
}

export function Select (props: SelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ open, setOpen ] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    const clb = function(ev: MouseEvent) {
      if (!ev.target) return;
      if (ref.current!.contains(ev.target as Node)) return;
      
      setOpen(false);
    };
    document.addEventListener('click', clb);

    return () => document.removeEventListener('click', clb);
  }, [open]);

  const selected = typeof props.active !== 'undefined' ? props.list.find(item => item.key === props.active) : null;

  const handler = (value: string) => {
    setOpen(false);
    if (props.onSelect) props.onSelect(value);
  }

  return <div ref={ref} className={styles.select + ' ' + (open ? styles.open : '')}>
    <Stack direction='row' className={styles.placeholder} onClick={() => setOpen(!open)}>
      <span>{
        selected ? selected.value : props.placeholder || 'Select'
      }</span>
      <ExpandMoreRoundedIcon className={styles.arrow} />
    </Stack>
    <Stack direction='column' className={styles.list}>
      {
        props.list.map(item => {
          return <div className={item === selected ? styles.active : ''} onClick={() => handler(item.key)}>{item.value}</div>
        })
      }
    </Stack>
  </div>
}

export function Link (props: { href: string, children: any }) {
  return <a className={styles.link} href={props.href} target='_blank'>{props.children}</a>
}

type ButtonProps = {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: any
  variant?: 'default' | 'red'
}

export function Button (props: ButtonProps) {
  let className = styles.button;
  if (props.variant === 'red') className += ' ' + styles.red;
  return <button className={className} onClick={props.onClick} disabled={props.disabled}>
    {props.loading ? <CircularProgress color="secondary" style={{ height: '20px', width: '20px', verticalAlign: 'middle', marginRight: '5px' }} /> : ''}
    {props.children}
  </button>
}

type InputAmountProps = InputString & {
  denom: string
}

export function InputAmount (props: InputAmountProps) {
  return <Stack direction='row' alignItems='center' className={styles.inputString + ' ' + styles.inputAmount} data-readOnly={props.readOnly}>
    <input value={props.value} onChange={(e) => props.onChange?.(e.target.value)} readOnly={props.readOnly} />
    <span>{props.denom}</span>
  </Stack>
}

export function InputCalendar (props: InputString) {
  const min = new Date().toISOString().slice(0, -8);
  return <input className={styles.inputString} type='datetime-local' value={props.value || min} min={min} onChange={(e) => props.onChange?.(e.target.value)} readOnly={props.readOnly} />
}

export function TimeTable (props: { timestamp: string, variant?: 'default' | 'warning' }) {
  const screen = ScaleHandler();

  let className = styles.timetable;
  if (props.variant === 'warning') className += ' ' + styles.warning;
  
  // Tue Mar 26 2024 20:12
  const date = new Date(parseInt(props.timestamp) * 1000).toString();
  const parse = /^(\w+) (\w+) (\d+) (\d+) (\d+):(\d+)/.exec(date);
  return <Stack direction={screen.isMobile ? 'column' : 'row'} gap='20px' justifyContent='center' alignItems='center' className={className}>
    <Stack direction='row' alignItems='center'>
        <span>{parse?.[4] ?? ''}</span>
        <span>{parse?.[2] ?? ''}</span>
        <span>{parse?.[3] ?? ''}</span>
    </Stack>
    <Stack direction='row' alignItems='center'>
      <span>{parse?.[5] ?? ''} : {parse?.[6] ?? ''}</span>
    </Stack>
  </Stack>
}