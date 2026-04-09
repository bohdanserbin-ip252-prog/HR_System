import { useCallback, useState } from 'react';
import { getErrorMessage } from '../uiUtils.js';

export function useAsyncStatus() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const resetAsyncStatus = useCallback(() => {
        setIsLoading(false);
        setErrorMessage('');
    }, []);

    const startLoading = useCallback(() => {
        setIsLoading(true);
        setErrorMessage('');
    }, []);

    const finishLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

    const failWithError = useCallback((error, fallbackMessage) => {
        setErrorMessage(getErrorMessage(error, fallbackMessage));
    }, []);

    return {
        errorMessage,
        isLoading,
        failWithError,
        finishLoading,
        resetAsyncStatus,
        setErrorMessage,
        setIsLoading,
        startLoading
    };
}
