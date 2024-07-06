import styles from './poolStack.module.css';
import { useEffect, useRef, useState } from 'react';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';

type PoolStackProps = {
    level?: number
    nextTime?: Date | null
}

export default function PoolStack (props: PoolStackProps) {
    const backdrop = useRef<HTMLDivElement>(null);
    const currentScale = useRef<HTMLDivElement>(null);
    const [ nextTime, setNextTime ] = useState<string | null>(null);

    useEffect(() => {
        if (!props.nextTime) return;
        const to = setInterval((time: Date) => {
            const diff = time.getTime() - Date.now();
            if (diff < 0) {
                clearInterval(to);
                setNextTime(null);
                return;
            }

            const sec = 1_000;
            const min = sec * 60;
            const hour = min * 60;
            const day = hour * 24;

            if (diff < min) {
                setNextTime(((diff % min) / sec).toFixed(0) + ' Sec');
            } else if (diff < hour) {
                setNextTime(((diff % hour) / min).toFixed(0) + ' Min');
            } else if (diff < day) {
                setNextTime(((diff % day) / hour).toFixed(0) + ' Hours');
            } else {
                setNextTime((diff / day).toFixed(0) + ' Days');
            }
        }, 1_000, props.nextTime);

        return () => clearInterval(to);
    }, [props.nextTime])

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
        {
            !props.level ?
                <div className={styles.awaiter}>
                    <div>
                        {
                            nextTime ?
                                <>Next in<br />{nextTime}</>
                            :
                                <AllInclusiveRoundedIcon />
                        }
                    </div>
                </div>
            : ''
        }
    </div>
}