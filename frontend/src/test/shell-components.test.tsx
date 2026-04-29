import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.tsx';
import AppShell from '../components/AppShell.tsx';
import { createRenderedPages, renderAppShell } from './shell-test-helpers.tsx';

describe('AppShell', () => {
    it('shows shell, badges, active navigation and wires logout', () => {
        const { container, props } = renderAppShell({ currentPage: 'organization' });
        expect(container.querySelector('#appContainer')).toHaveStyle({ display: 'block' });
        expect(container.querySelector('.nav-item[data-page="organization"]')).toHaveClass('active');
        expect(screen.getByText('7')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Вийти' }));
        expect(props.onLogout).toHaveBeenCalledTimes(1);
    });

    it('renders page navigation as buttons and marks active items with aria-current', () => {
        const { container } = renderAppShell({ currentPage: 'activity' });
        expect(container.querySelectorAll('a[data-page]')).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Огляд' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Кадри' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Активність' })).toHaveLength(2);
        expect(screen.getByRole('button', { name: /Організація/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Скарги' })).toBeInTheDocument();
        const activeItems = container.querySelectorAll('[aria-current="page"]');
        expect(activeItems).toHaveLength(2);
        expect(container.querySelector('.top-nav [data-page="activity"]')).toHaveAttribute('aria-current', 'page');
        expect(container.querySelector('.nav-item[data-page="activity"]')).toHaveAttribute('aria-current', 'page');
    });

    it('calls sidebar employee create action for admin users', () => {
        const { actions } = renderAppShell();
        fireEvent.click(screen.getByRole('button', { name: /Додати працівника/ }));
        expect(actions.openEmployeeCreate).toHaveBeenCalledTimes(1);
    });

    it('renders desktop notification toggle and updates preference on click', () => {
        const { props } = renderAppShell({ desktopNotificationsEnabled: false });
        const toggle = screen.getByRole('checkbox', { name: 'Desktop-сповіщення' });
        expect(toggle).not.toBeChecked();
        expect(screen.getByText('Показувати системні сповіщення, коли вкладка неактивна.')).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(props.onDesktopNotificationsToggle).toHaveBeenCalledWith(true);
    });

    it('shows FAB on supported admin pages and handles click', () => {
        const { container, props } = renderAppShell({ currentPage: 'development' });
        const fabButton = screen.getByRole('button', { name: 'Додати' });
        expect(fabButton).toHaveStyle({ display: 'flex' });
        fireEvent.click(fabButton);
        expect(props.onFab).toHaveBeenCalledTimes(1);
    });

    it('hides sidebar and FAB on profile page', () => {
        const { container } = renderAppShell({ currentPage: 'profile' });

        expect(container.querySelector('#sidebar')).not.toBeInTheDocument();
        expect(container.querySelector('#menuBtn')).not.toBeInTheDocument();
        expect(container.querySelector('#fabBtn')).toHaveStyle({ display: 'none' });
        expect(container.querySelector('#page-profile')).toHaveClass('active');
    });

    it('renders accessible drawer toggle button with state attributes', () => {
        const { container, rerender } = renderAppShell({ currentPage: 'employees', isSidebarOpen: true });
        const openMenuToggle = container.querySelector('#menuBtn');

        expect(openMenuToggle).toHaveAttribute('aria-label', 'Закрити навігацію');
        expect(openMenuToggle).toHaveAttribute('aria-expanded', 'true');
        expect(openMenuToggle).toHaveAttribute('aria-controls', 'sidebar');

        const nextProps = {
            badgeCounts: { employees: 7, departments: 4, positions: 4 },
            isVisible: true,
            currentUser: { username: 'admin', role: 'admin' },
            currentPage: 'employees',
            desktopNotificationsEnabled: false,
            isDesktopNotificationsSupported: true,
            isSidebarOpen: false,
            renderedPages: createRenderedPages(),
            onNavigate: vi.fn(),
            onToggleSidebar: vi.fn(),
            onDesktopNotificationsToggle: vi.fn(),
            onLogout: vi.fn(),
            onFab: vi.fn()
        };

        rerender(
            <AppContextProvider state={{}} actions={{ openEmployeeCreate: vi.fn() }}>
                <AppShell {...nextProps} />
            </AppContextProvider>
        );

        const closedMenuToggle = container.querySelector('#menuBtn');
        expect(closedMenuToggle).toHaveAttribute('aria-label', 'Відкрити навігацію');
        expect(closedMenuToggle).toHaveAttribute('aria-expanded', 'false');
        expect(closedMenuToggle).toHaveAttribute('aria-controls', 'sidebar');
    });

    it('exposes explicit labels for icon-only controls', () => {
        const { container } = renderAppShell({ currentPage: 'employees' });

        expect(screen.getByRole('button', { name: 'Вийти' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Додати' })).toBeInTheDocument();
        expect(container.querySelector('#fabBtn')).toHaveAttribute('aria-label', 'Додати');
    });

    it('renders sidebar backdrop on non-profile pages', () => {
        const { container } = renderAppShell({ currentPage: 'employees' });

        expect(container.querySelector('.sidebar-backdrop')).toBeInTheDocument();
    });

    it('calls onToggleSidebar when backdrop is clicked', () => {
        const { container, props } = renderAppShell({ currentPage: 'employees' });
        const backdrop = container.querySelector('.sidebar-backdrop');

        expect(backdrop).toBeInTheDocument();
        fireEvent.click(backdrop);
        expect(props.onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('hides drawer and backdrop from accessibility tree when closed on mobile/tablet', () => {
        try {
            vi.stubGlobal(
                'matchMedia',
                vi.fn().mockImplementation(query => ({
                    matches: query === '(max-width: 1024px)',
                    media: query,
                    onchange: null,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    dispatchEvent: vi.fn()
                }))
            );

            const { container, rerender } = renderAppShell({ currentPage: 'employees', isSidebarOpen: false });
            const closedSidebar = container.querySelector('#sidebar');
            const closedBackdrop = container.querySelector('.sidebar-backdrop');

            expect(closedSidebar).toHaveAttribute('aria-hidden', 'true');
            expect(closedBackdrop).toHaveAttribute('aria-hidden', 'true');

            const openedProps = {
                badgeCounts: { employees: 7, departments: 4, positions: 4 },
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
                onFab: vi.fn()
            };

            rerender(
                <AppContextProvider state={{}} actions={{ openEmployeeCreate: vi.fn() }}>
                    <AppShell {...openedProps} />
                </AppContextProvider>
            );

            const openedSidebar = container.querySelector('#sidebar');
            const openedBackdrop = container.querySelector('.sidebar-backdrop');

            expect(openedSidebar).toHaveAttribute('aria-hidden', 'false');
            expect(openedBackdrop).toHaveAttribute('aria-hidden', 'false');
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('adds profile shell state class on profile page', () => {
        const { container } = renderAppShell({ currentPage: 'profile' });

        expect(container.querySelector('.app-shell')).toHaveClass('app-shell--profile');
    });

    it('hides admin action button and FAB for non-admin users', () => {
        const { container } = renderAppShell({
            currentUser: { username: 'viewer', role: 'viewer' },
            currentPage: 'employees'
        });

        expect(screen.queryByRole('button', { name: /Додати працівника/ })).not.toBeInTheDocument();
        expect(container.querySelector('#fabBtn')).toHaveStyle({ display: 'none' });
        expect(screen.getByText('Користувач')).toBeInTheDocument();
    });

    it('shows complaints page and FAB for non-admin complaint creation', () => {
        const { container, props } = renderAppShell({
            currentUser: { username: 'viewer', role: 'user' },
            currentPage: 'complaints'
        });

        expect(container.querySelector('#page-complaints')).toHaveClass('active');
        expect(container.querySelector('#fabBtn')).toHaveStyle({ display: 'flex' });
        fireEvent.click(screen.getByRole('button', { name: 'Додати' }));
        expect(props.onFab).toHaveBeenCalledTimes(1);
    });
});
