import { createContext, useContext, type ReactNode } from 'react';

const AppStateContext = createContext<unknown>(null);
const AppActionsContext = createContext<unknown>(null);

interface AppContextProviderProps {
    state: unknown;
    actions: unknown;
    children: ReactNode;
}

export function AppContextProvider({ state, actions, children }: AppContextProviderProps) {
    return (
        <AppStateContext.Provider value={state}>
            <AppActionsContext.Provider value={actions}>
                {children}
            </AppActionsContext.Provider>
        </AppStateContext.Provider>
    );
}

export function useAppState<T = unknown>(): T {
    const value = useContext(AppStateContext);
    if (!value) throw new Error('useAppState must be used within AppContextProvider');
    return value as T;
}

export function useAppActions<T = unknown>(): T {
    const value = useContext(AppActionsContext);
    if (!value) throw new Error('useAppActions must be used within AppContextProvider');
    return value as T;
}
