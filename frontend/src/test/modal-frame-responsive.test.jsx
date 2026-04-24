import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModalFrame from '../components/ModalFrame.jsx';

function renderModal(size = 'standard') {
  const onClose = vi.fn();

  render(
    <ModalFrame
      modalId="testModal"
      title="Тестова модалка"
      size={size}
      isOpen={true}
      onClose={onClose}
      footer={<button type="button">OK</button>}
    >
      <p>Body</p>
    </ModalFrame>
  );

  return { onClose };
}

describe('ModalFrame semantic size variants', () => {
  it('uses compact semantic size class without inline width', () => {
    renderModal('compact');

    const modal = document.body.querySelector('.modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('modal--compact');
    expect(modal).not.toHaveAttribute('style');
  });

  it('uses standard semantic size class without inline width', () => {
    renderModal('standard');

    const modal = document.body.querySelector('.modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('modal--standard');
    expect(modal).not.toHaveAttribute('style');
  });

  it('uses wide semantic size class without inline width', () => {
    renderModal('wide');

    const modal = document.body.querySelector('.modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('modal--wide');
    expect(modal).not.toHaveAttribute('style');
  });

  it('defaults to standard semantic size class when size is omitted', () => {
    const onClose = vi.fn();

    render(
      <ModalFrame
        modalId="defaultSizeModal"
        title="Default size"
        isOpen={true}
        onClose={onClose}
        footer={<button type="button">OK</button>}
      >
        <p>Body</p>
      </ModalFrame>
    );

    const modal = document.body.querySelector('.modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('modal--standard');
    expect(modal).not.toHaveAttribute('style');
  });

  it('renders dialog semantics and aria wiring', () => {
    renderModal('standard');

    const dialog = screen.getByRole('dialog', { name: 'Тестова модалка' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const title = screen.getByRole('heading', { name: 'Тестова модалка' });
    const body = document.body.querySelector('.modal-body');

    expect(title).toHaveAttribute('id');
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(body).toHaveAttribute('id');
    expect(dialog).toHaveAttribute('aria-describedby', body.id);
  });

  it('closes by Escape and backdrop click', () => {
    const { onClose } = renderModal('standard');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = document.body.querySelector('.modal-overlay');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('traps Tab focus inside the modal while open', () => {
    renderModal('standard');

    const closeButton = document.body.querySelector('.modal-close');
    const actionButton = screen.getByRole('button', { name: 'OK' });

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(actionButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('moves focus into modal and restores it when closed', () => {
    const outsideButton = document.createElement('button');
    outsideButton.id = 'focusBefore';
    outsideButton.type = 'button';
    outsideButton.textContent = 'outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    expect(outsideButton).toHaveFocus();

    const onClose = vi.fn();
    const { rerender } = render(
      <ModalFrame
        modalId="focusModal"
        title="Focus modal"
        size="standard"
        isOpen={true}
        onClose={onClose}
        footer={<button type="button">Confirm</button>}
      >
        <input aria-label="Input" />
      </ModalFrame>
    );

    const closeButton = document.body.querySelector('.modal-close');
    expect(closeButton).toHaveFocus();

    rerender(
      <ModalFrame
        modalId="focusModal"
        title="Focus modal"
        size="standard"
        isOpen={false}
        onClose={onClose}
        footer={<button type="button">Confirm</button>}
      >
        <input aria-label="Input" />
      </ModalFrame>
    );

    expect(outsideButton).toHaveFocus();
  });

  it('keeps focused input on rerender when onClose identity changes', () => {
    const onCloseA = vi.fn();
    const { rerender } = render(
      <ModalFrame
        modalId="rerenderFocusModal"
        title="Rerender focus modal"
        size="standard"
        isOpen={true}
        onClose={onCloseA}
        footer={<button type="button">Confirm</button>}
      >
        <input aria-label="Typing input" />
      </ModalFrame>
    );

    const input = screen.getByLabelText('Typing input');
    input.focus();
    expect(input).toHaveFocus();

    const onCloseB = vi.fn();
    rerender(
      <ModalFrame
        modalId="rerenderFocusModal"
        title="Rerender focus modal updated"
        size="standard"
        isOpen={true}
        onClose={onCloseB}
        footer={<button type="button">Confirm</button>}
      >
        <input aria-label="Typing input" />
      </ModalFrame>
    );

    expect(screen.getByLabelText('Typing input')).toHaveFocus();
  });
});
