import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginScreen from '../components/LoginScreen.tsx';

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
