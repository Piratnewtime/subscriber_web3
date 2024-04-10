'use client';

import { useEffect, useState } from "react";

export default function ScaleHandler () {
    const [ width, setWidth ] = useState<number>(1000);

    useEffect(() => {
        const resize = () => {
            setWidth(globalThis.window.screen.width);
        }
        resize();

        globalThis.window.addEventListener('resize', resize);

        return () => globalThis.window.removeEventListener('resize', resize);
    });

    return {
        width,
        isMobile: width < 500
    }
}