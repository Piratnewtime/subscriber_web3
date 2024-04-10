import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import styles from './switch.module.css';
import ScaleHandler from './scaleHandler';

type SwitchProps = {
    options: { key: string, value: string }[]
    value?: string
    onSwitch?: (key: string, index: number) => void
}

export function Switch (props: SwitchProps) {
    const screen = ScaleHandler();
    const refs = props.options.map(() => useRef<HTMLDivElement>(null));
    const [ initIndex, setInitIndex ] = useState<number>(props.value ? props.options.findIndex(_ => _.key === props.value) : 0);
    const [ currentRef, setCurrentRef ] = useState<RefObject<HTMLDivElement>>(refs[initIndex]);
    const [ width, setWidth ] = useState<number>();
    const [ left, setLeft ] = useState<number>();

    const select = useCallback((i: number) => {
        setInitIndex(i);
        setCurrentRef(refs[i]);
        //setWidth(refs[i].current?.offsetWidth);
        //setLeft(refs[i].current?.offsetLeft);
        if (props.onSwitch) props.onSwitch(props.options[i].key, i);
    }, [props, refs])

    useEffect(() => {
        setWidth(refs[initIndex].current?.offsetWidth);
        setLeft(refs[initIndex].current?.offsetLeft);
    }, [screen, initIndex])

    return <div className={styles.switch}>
        <div className={styles.options}>
            <span className={styles.pointer} style={{ width, left }}></span>
            { props.options.map((opt, i) => {
                return <div
                    key={`switch_option_${i}`}
                    ref={refs[i]}
                    className={ refs[i] === currentRef ? styles.active : undefined }
                    onClick={() => select(i)}
                >
                    {opt.value}
                </div>
            }) }
        </div>
    </div>
}