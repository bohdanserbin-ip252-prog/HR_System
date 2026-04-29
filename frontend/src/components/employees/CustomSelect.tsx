import { useRef } from 'react';

export default function CustomSelect({
  wrapperId,
  icon,
  label,
  options,
  value,
  isOpen,
  onToggle,
  onSelect
}) {
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const optionsId = `${wrapperId}-options`;
  const selectedIndex = Math.max(
    0,
    options.findIndex(option => String(option.value) === String(value))
  );

  function focusOption(index) {
    optionRefs.current[index]?.focus();
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = event.key === 'ArrowUp' ? options.length - 1 : selectedIndex;
      if (isOpen) {
        focusOption(nextIndex);
      } else {
        onToggle();
        window.requestAnimationFrame(() => focusOption(nextIndex));
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      onToggle();
    }
  }

  function handleOptionKeyDown(event, option, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(option.value);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption((index + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption((index - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onToggle();
      triggerRef.current?.focus();
    }
  }

  return (
    <div className={`custom-select${isOpen ? ' open' : ''}`} id={wrapperId}>
      <button
        aria-controls={optionsId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        className="custom-select-trigger"
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined"
          style={{ fontSize: '18px', color: 'var(--primary)' }}
        >
          {icon}
        </span>
        <span className="custom-select-label">{label}</span>
        <span className="material-symbols-outlined custom-select-arrow" aria-hidden="true">expand_more</span>
      </button>
      <ul
        aria-label={label}
        className="custom-select-options"
        hidden={!isOpen}
        id={optionsId}
        role="listbox"
      >
        {options.map((option, index) => (
          <li
            key={option.value || 'all'}
            aria-selected={String(option.value) === String(value)}
            className={`custom-select-option${String(option.value) === String(value) ? ' selected' : ''}`}
            data-value={option.value}
            id={`${optionsId}-${index}`}
            onClick={() => onSelect(option.value)}
            onKeyDown={event => handleOptionKeyDown(event, option, index)}
            ref={element => {
              optionRefs.current[index] = element;
            }}
            role="option"
            tabIndex={isOpen ? -1 : undefined}
          >
            {option.icon.startsWith('status-') ? (
              <span
                aria-hidden="true"
                className={`status-dot ${option.icon.replace('status-', '')}`}
                style={{ marginRight: '4px' }}
              />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
                {option.icon}
              </span>
            )}{' '}
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
