import { useCallback, useEffect, useState } from 'react';

function getInitialDark() {
    if (typeof window === 'undefined') return false;
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return false;
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function useDarkMode() {
    const [isDark, setIsDark] = useState(getInitialDark);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }
    }, [isDark]);

    const toggle = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    return { isDark, toggle };
}
