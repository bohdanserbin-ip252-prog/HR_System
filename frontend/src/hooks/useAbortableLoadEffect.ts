import { useEffect, useEffectEvent } from 'react';

export function isAbortedLoad(error, signal) {
    return error?.name === 'AbortError' || signal.aborted;
}

export function useAbortableLoadEffect({ enabled = true, deps = [], onDisabled, load }) {
    const handleDisabled = useEffectEvent(() => {
        onDisabled?.();
    });

    const handleLoad = useEffectEvent(async ({ signal, controller }) => {
        await load({ signal, controller });
    });

    useEffect(() => {
        if (!enabled) {
            handleDisabled();
            return undefined;
        }

        const controller = new AbortController();
        void handleLoad({ signal: controller.signal, controller });

        return () => {
            controller.abort();
        };
    }, [enabled, ...deps]);
}
