import { createContext, useContext } from 'react';

const AppStateContext = createContext(null);
const AppActionsContext = createContext(null);

export function AppContextProvider({ state, actions, children }) {
    return (
        <AppStateContext.Provider value={state}>
            <AppActionsContext.Provider value={actions}>
                {children}
            </AppActionsContext.Provider>
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const value = useContext(AppStateContext);
    if (!value) throw new Error('useAppState must be used within AppContextProvider');
    return value;
}

export function useAppActions() {
    const value = useContext(AppActionsContext);
    if (!value) throw new Error('useAppActions must be used within AppContextProvider');
    return value;
}
