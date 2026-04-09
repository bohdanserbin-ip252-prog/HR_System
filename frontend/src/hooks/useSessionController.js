import { useEffect, useRef, useState } from 'react';
import { API, fetchJSON } from '../api.js';

export function useSessionController({
    currentUserRef,
    currentPageRef,
    setCurrentPage,
    setSidebarOpen,
    loadPageData,
    refreshBadgeCounts,
    resetActionState,
    resetDataState
}) {
    const bootstrappedRef = useRef(false);
    const [authStatus, setAuthStatus] = useState('loading');
    const [currentUser, setCurrentUser] = useState(null);
    const [loginError, setLoginError] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    function resetSessionState(message = '') {
        currentUserRef.current = null;
        currentPageRef.current = 'dashboard';
        setCurrentUser(null);
        setCurrentPage('dashboard');
        setSidebarOpen(false);
        setPassword('');
        setLoginError(message);
        setAuthStatus('unauthenticated');
        resetActionState();
        resetDataState();
    }

    function showLoginScreen(message = '') {
        resetSessionState(message);
    }

    function handleUnauthorized(message = '') {
        showLoginScreen(message);
    }

    useEffect(() => {
        if (bootstrappedRef.current) return;
        bootstrappedRef.current = true;

        let disposed = false;

        async function bootstrapSession() {
            try {
                const user = await fetchJSON(`${API}/api/auth/me`, { suppressAuthRedirect: true });
                if (disposed) return;

                currentUserRef.current = user;
                currentPageRef.current = 'dashboard';
                setCurrentUser(user);
                setCurrentPage('dashboard');
                setLoginError('');
                setAuthStatus('authenticated');
                await Promise.all([
                    refreshBadgeCounts(true),
                    loadPageData('dashboard', 'bootstrap-session')
                ]);
            } catch (_) {
                if (disposed) return;
                resetSessionState('');
            }
        }

        void bootstrapSession();

        return () => {
            disposed = true;
        };
    }, []);

    async function handleLoginSubmit(event) {
        event.preventDefault();
        if (isSubmitting) return;

        const normalizedUsername = username.trim();
        setIsSubmitting(true);
        setLoginError('');

        try {
            const data = await fetchJSON(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: normalizedUsername,
                    password
                }),
                suppressAuthRedirect: true
            });

            currentUserRef.current = data.user;
            currentPageRef.current = 'dashboard';
            setUsername(normalizedUsername);
            setPassword('');
            setCurrentUser(data.user);
            setCurrentPage('dashboard');
            setSidebarOpen(false);
            setAuthStatus('authenticated');
            await Promise.all([
                refreshBadgeCounts(true),
                loadPageData('dashboard', 'login-success')
            ]);
        } catch (error) {
            setLoginError(error?.message || 'Помилка підключення до сервера');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleLogout() {
        setIsSubmitting(true);
        try {
            await fetchJSON(`${API}/api/auth/logout`, {
                method: 'POST',
                suppressAuthRedirect: true
            });
        } catch (_) {
            // Local UI still resets even if the server-side session is already gone.
        } finally {
            showLoginScreen('');
            setIsSubmitting(false);
        }
    }

    return {
        authStatus,
        currentUser,
        isSubmitting,
        loginError,
        password,
        username,
        handleLoginSubmit,
        handleLogout,
        handleUnauthorized,
        setPassword,
        setUsername,
        showLoginScreen
    };
}
