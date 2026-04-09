import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.jsx';
import AppShell from '../components/AppShell.jsx';
import LoginScreen from '../components/LoginScreen.jsx';

function createPageViews() {
    return {
        dashboard: <div>dashboard page</div>,
        employees: <div>employees page</div>,
        departments: <div>departments page</div>,
        positions: <div>positions page</div>,
        profile: <div>profile page</div>,
        onboarding: <div>onboarding page</div>,
        development: <div>development page</div>
    };
}

function renderAppShell(overrides = {}) {
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
        pageViews: createPageViews(),
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

describe('LoginScreen', () => {
    it('renders visible login form with error message and reacts to input changes', () => {
        const handleUsernameChange = vi.fn();
        const handlePasswordChange = vi.fn();

        const { container } = render(
            <LoginScreen
                isVisible={true}
                username="admin"
                password="secret"
                errorMessage="Невірний логін або пароль"
                isBusy={false}
                onUsernameChange={handleUsernameChange}
                onPasswordChange={handlePasswordChange}
                onSubmit={vi.fn()}
            />
        );

        expect(screen.getByRole('heading', { level: 1, name: 'HR System' })).toBeInTheDocument();
        expect(screen.getByText('Невірний логін або пароль')).toBeInTheDocument();
        expect(container.querySelector('#loginScreen')).toHaveStyle({ display: 'flex' });

        fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'viewer' } });
        fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'viewer123' } });

        expect(handleUsernameChange).toHaveBeenCalledWith('viewer');
        expect(handlePasswordChange).toHaveBeenCalledWith('viewer123');
    });

    it('submits the form and reflects busy state', () => {
        const handleSubmit = vi.fn(event => event.preventDefault());

        render(
            <LoginScreen
                isVisible={true}
                username="admin"
                password="admin123"
                errorMessage=""
                isBusy={true}
                onUsernameChange={vi.fn()}
                onPasswordChange={vi.fn()}
                onSubmit={handleSubmit}
            />
        );

        const usernameInput = screen.getByLabelText('Логін');
        const passwordInput = screen.getByLabelText('Пароль');
        const submitButton = screen.getByRole('button', { name: /Завантаження.../ });

        expect(usernameInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();

        fireEvent.submit(submitButton.closest('form'));
        expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('hides the screen when isVisible is false', () => {
        const { container } = render(
            <LoginScreen
                isVisible={false}
                username=""
                password=""
                errorMessage=""
                isBusy={false}
                onUsernameChange={vi.fn()}
                onPasswordChange={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        expect(container.querySelector('#loginScreen')).toHaveStyle({ display: 'none' });
    });
});

describe('AppShell', () => {
    it('shows shell, badges, active navigation and wires logout', () => {
        const { container, props } = renderAppShell({ currentPage: 'departments' });

        expect(container.querySelector('#appContainer')).toHaveStyle({ display: 'block' });
        expect(container.querySelector('.top-nav a[data-page="departments"]')).toHaveClass('active');
        expect(container.querySelector('.nav-item[data-page="departments"]')).toHaveClass('active');
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getAllByText('4')).toHaveLength(2);

        fireEvent.click(screen.getByTitle('Вийти'));
        expect(props.onLogout).toHaveBeenCalledTimes(1);
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

        const fabButton = container.querySelector('#fabBtn');
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

    it('hides admin action button and FAB for non-admin users', () => {
        const { container } = renderAppShell({
            currentUser: { username: 'viewer', role: 'viewer' },
            currentPage: 'employees'
        });

        expect(screen.queryByRole('button', { name: /Додати працівника/ })).not.toBeInTheDocument();
        expect(container.querySelector('#fabBtn')).toHaveStyle({ display: 'none' });
        expect(screen.getByText('Користувач')).toBeInTheDocument();
    });
});
