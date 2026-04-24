import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DevelopmentMeetingsCard from '../components/development/DevelopmentMeetingsCard.jsx';

describe('DevelopmentMeetingsCard', () => {
  it('does not normalize impossible meeting dates into another calendar day', () => {
    const { container } = render(
      <DevelopmentMeetingsCard
        meetings={[
          {
            id: 1,
            title: 'Impossible meeting',
            type: '1:1',
            date: '2026-04-31'
          }
        ]}
        isAdmin={false}
        openMeetingCreate={vi.fn()}
        editMeeting={vi.fn()}
        confirmDelete={vi.fn()}
      />
    );

    expect(container.querySelector('.dev-meeting-month')).toHaveTextContent('—');
    expect(container.querySelector('.dev-meeting-day')).toHaveTextContent('—');
  });
});
