import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomSelect from '../components/employees/CustomSelect.jsx';
import EmployeesToolbar from '../components/employees/EmployeesToolbar.jsx';

function renderToolbar() {
  const props = {
    searchInput: '',
    setSearchInput: vi.fn(),
    activeDepartment: null,
    departmentOptions: [{ value: '', label: 'Усі відділи', icon: 'category' }],
    departmentId: '',
    setDepartmentId: vi.fn(),
    status: '',
    setStatus: vi.fn(),
    sortBy: 'id',
    setSortBy: vi.fn(),
    sortDir: 'desc',
    setSortDir: vi.fn(),
    openDropdown: '',
    setOpenDropdown: vi.fn()
  };

  return render(<EmployeesToolbar {...props} />);
}

describe('employees accessibility controls', () => {
  it('gives employee search an accessible name', () => {
    renderToolbar();

    expect(screen.getByRole('textbox', { name: 'Пошук працівників' })).toBeInTheDocument();
  });

  it('supports keyboard operation for custom filter selects', () => {
    const handleSelect = vi.fn();
    const handleToggle = vi.fn();
    render(
      <CustomSelect
        wrapperId="departmentFilter"
        icon="apartment"
        label="Усі відділи"
        options={[
          { value: '', label: 'Усі відділи', icon: 'category' },
          { value: 'hr', label: 'HR', icon: 'apartment' }
        ]}
        value=""
        isOpen
        onToggle={handleToggle}
        onSelect={handleSelect}
      />
    );

    const trigger = screen.getByRole('combobox', { name: 'Усі відділи' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'departmentFilter-options');
    expect(screen.getByRole('listbox', { name: 'Усі відділи' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Усі відділи' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Усі відділи' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('option', { name: 'HR' }), { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith('hr');

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(handleToggle).toHaveBeenCalled();
  });
});
