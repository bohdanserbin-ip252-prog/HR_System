import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActionHeader from '../components/ActionHeader.jsx';
import FormErrorMessage from '../components/FormErrorMessage.jsx';
import PageStateBoundary from '../components/PageStateBoundary.jsx';
import SectionEmptyState from '../components/SectionEmptyState.jsx';

describe('FormErrorMessage', () => {
    it('renders nothing when message is empty', () => {
        const { container } = render(<FormErrorMessage message="" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the message with visible default display and merged styles', () => {
        render(<FormErrorMessage id="loginError" message="Невірний логін або пароль" style={{ marginBottom: '4px' }} />);
        const banner = screen.getByText('Невірний логін або пароль');
        expect(banner).toHaveAttribute('id', 'loginError');
        expect(banner).toHaveStyle({ display: 'block', marginBottom: '4px' });
    });
});

describe('PageStateBoundary', () => {
    it('renders skeleton card for loading state by default', () => {
        render(
            <PageStateBoundary
                loading={{ icon: 'hourglass_top', title: 'Loading', description: 'Loading desc' }}
                error={{ icon: 'error', title: 'Error', description: 'Error desc' }}
                empty={{ icon: 'inbox', title: 'Empty', description: 'Empty desc' }}
            >
                <div>children</div>
            </PageStateBoundary>
        );

        expect(screen.getByLabelText('Завантаження')).toBeInTheDocument();
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
        expect(screen.queryByText('children')).not.toBeInTheDocument();
    });

    it('renders skeleton table for loading state on table pages', () => {
        render(
            <PageStateBoundary
                loading={{ icon: 'hourglass_top', title: 'Loading', description: 'Loading desc' }}
                pageName="employees"
            >
                <div>children</div>
            </PageStateBoundary>
        );

        expect(screen.getByLabelText('Завантаження таблиці')).toBeInTheDocument();
        expect(screen.queryByText('children')).not.toBeInTheDocument();
    });

    it('renders children when no state is active', () => {
        render(
            <PageStateBoundary>
                <div>children</div>
            </PageStateBoundary>
        );

        expect(screen.getByText('children')).toBeInTheDocument();
    });
});

describe('SectionEmptyState', () => {
    it('renders empty state when section has no content', () => {
        render(
            <SectionEmptyState
                hasContent={false}
                icon="checklist"
                title="Завдань поки немає"
                description="Порожня секція"
            >
                <div>content</div>
            </SectionEmptyState>
        );

        expect(screen.getByText('Завдань поки немає')).toBeInTheDocument();
        expect(screen.queryByText('content')).not.toBeInTheDocument();
    });

    it('renders children when section has content', () => {
        render(
            <SectionEmptyState hasContent={true} icon="checklist" title="ignored" description="ignored">
                <div>content</div>
            </SectionEmptyState>
        );

        expect(screen.getByText('content')).toBeInTheDocument();
        expect(screen.queryByText('ignored')).not.toBeInTheDocument();
    });
});

describe('ActionHeader', () => {
    it('renders title, icon, and action button', () => {
        const handleAction = vi.fn();

        render(
            <ActionHeader
                containerClassName="ob-tasks-header"
                title="Тиждень 1: Основи"
                titleLevel="h3"
                titleIcon="forum"
                showAction={true}
                actionLabel="Додати задачу"
                onAction={handleAction}
            />
        );

        expect(screen.getByRole('heading', { level: 3, name: /Тиждень 1: Основи/ })).toBeInTheDocument();
        expect(screen.getByText('forum')).toBeInTheDocument();
        const button = screen.getByRole('button', { name: /Додати задачу/ });
        fireEvent.click(button);
        expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('hides the action button when showAction is false', () => {
        render(<ActionHeader title="Поточні цілі" showAction={false} />);
        expect(screen.getByRole('heading', { level: 2, name: 'Поточні цілі' })).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
