import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AppContextProvider } from '../appContext.tsx';
import AppShell from '../components/AppShell.tsx';

export function createRenderedPages() {
    return {
        dashboard: <div>dashboard page</div>,
        employees: <div>employees page</div>,
        organization: <div>organization page</div>,
        profile: <div>profile page</div>,
        onboarding: <div>onboarding page</div>,
        development: <div>development page</div>,
        complaints: <div>complaints page</div>,
        activity: <div>activity page</div>,
        audit: <div>audit page</div>,
        operations: <div>operations page</div>,
        system: <div>system page</div>
    };
}

export function renderAppShell(overrides = {}) {
    const actions = {
        openEmployeeCreate: vi.fn(),
        ...overrides.actions
    };

    const props = {
        badgeCounts: {
            employees: 7,
            departments: 4,
            positions: 4,
            ...overrides.badgeCounts
        },
        isVisible: true,
        currentUser: { username: 'admin', role: 'admin' },
        currentPage: 'employees',
        desktopNotificationsEnabled: false,
        isDesktopNotificationsSupported: true,
        isSidebarOpen: true,
        renderedPages: createRenderedPages(),
        onNavigate: vi.fn(),
        onToggleSidebar: vi.fn(),
        onDesktopNotificationsToggle: vi.fn(),
        onLogout: vi.fn(),
        onFab: vi.fn(),
        ...overrides
    };

    const result = render(
        <AppContextProvider state={{}} actions={actions}>
            <AppShell {...props} />
        </AppContextProvider>
    );

    return {
        ...result,
        actions,
        props
    };
}
