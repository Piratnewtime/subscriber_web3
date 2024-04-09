import styles from './poolStack.module.css';
import { useEffect, useRef } from 'react';

type PoolStackProps = {
    level?: number
}

export default function PoolStack (props: PoolStackProps) {
    const backdrop = useRef<HTMLDivElement>(null);
    const currentScale = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof props.level === 'undefined') return;
        backdrop.current!.style.setProperty("--level", props.level + '%');
        currentScale.current!.style.setProperty("--level", (backdrop.current!.getClientRects().item(0)?.height ?? 0) + 'px');
    }, [props.level])

    return <div className={styles.pool}>
        <div className={styles.backdrop} ref={backdrop}></div>
        <div className={styles.skeleton}></div>
        <div className={styles.scale + (props.level && props.level >= 98 ? ' ' + styles.full : '')}>
            <span className={styles.current} ref={currentScale}>{props.level?.toFixed(0) ?? 0}%</span>
        </div>
    </div>
}