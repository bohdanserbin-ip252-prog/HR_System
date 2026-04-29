import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HubPage from '../components/HubPage.tsx';

function DepartmentsTab() {
  const [value, setValue] = useState('');

  return (
    <label>
      Departments
      <input
        aria-label="Departments input"
        onChange={event => setValue(event.target.value)}
        value={value}
      />
    </label>
  );
}

function AccessTab() {
  const [value, setValue] = useState('');

  return (
    <label>
      Access
      <input
        aria-label="Access input"
        onChange={event => setValue(event.target.value)}
        value={value}
      />
    </label>
  );
}

describe('HubPage tab stability', () => {
  it('preserves visited tab state when switching between tabs', () => {
    render(
      <HubPage
        title="Організація"
        description="Tab stability"
        tabs={[
          { key: 'departments', label: 'Departments', render: () => <DepartmentsTab /> },
          { key: 'access', label: 'Access', render: () => <AccessTab /> }
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText('Departments input'), {
      target: { value: 'persist me' }
    });

    fireEvent.click(screen.getByRole('tab', { name: /Access/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Departments/i }));

    expect(screen.getByLabelText('Departments input')).toHaveValue('persist me');
  });
});
