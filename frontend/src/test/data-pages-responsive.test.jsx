import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContextProvider } from '../appContext.jsx';
import DashboardPage from '../components/DashboardPage.jsx';
import OrganizationEntityTabShell from '../components/OrganizationEntityTabShell.jsx';

const mockFetchJSON = vi.fn();

vi.mock('../api.js', () => ({
  API: '',
  fetchJSON: (...args) => mockFetchJSON(...args)
}));

function renderWithActions(node, actionsOverrides = {}) {
  const actions = {
    navigateTo: vi.fn(),
    handleUnauthorized: vi.fn(),
    ...actionsOverrides
  };

  return {
    ...render(
      <AppContextProvider state={{}} actions={actions}>
        {node}
      </AppContextProvider>
    ),
    actions
  };
}

describe('Data pages responsive wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard content inside shared page-content and KPI hook grid', () => {
    const snapshot = {
      status: 'success',
      data: {
        stats: {
          totalEmployees: 24,
          totalDepartments: 5,
          totalPositions: 9,
          activeCount: 20,
          onLeaveCount: 2,
          avgSalary: 28000,
          salaryByDept: [{ name: 'IT', avg_salary: 32000 }],
          deptStats: [{ name: 'IT Department', count: 11 }],
          recentHires: []
        }
      }
    };

    const { container } = renderWithActions(
      <DashboardPage isActive={true} snapshot={snapshot} />
    );

    expect(container.querySelector('.page-header')).toBeInTheDocument();
    expect(container.querySelector('.page-content.dashboard-content')).toBeInTheDocument();
    expect(container.querySelector('.dashboard-content .dashboard-grid')).toBeInTheDocument();
    expect(container.querySelector('.dashboard-kpi-grid')).toBeInTheDocument();
  });

  it('keeps activeCount=0 as 0% KPI when totalEmployees is greater than zero', () => {
    const snapshot = {
      status: 'success',
      data: {
        stats: {
          totalEmployees: 12,
          totalDepartments: 3,
          totalPositions: 4,
          activeCount: 0,
          onLeaveCount: 0,
          avgSalary: 25000,
          salaryByDept: [{ name: 'IT', avg_salary: 30000 }],
          deptStats: [{ name: 'IT Department', count: 6 }],
          recentHires: []
        }
      }
    };

    renderWithActions(<DashboardPage isActive={true} snapshot={snapshot} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders organization pages with shared action/content wrappers and organization grid modifier', async () => {
    mockFetchJSON.mockResolvedValueOnce([
      {
        id: 1,
        name: 'IT',
        description: 'Core systems',
        head_name: 'Alex Green',
        employee_count: 16
      }
    ]);

    const { container } = renderWithActions(
      <OrganizationEntityTabShell
        endpoint="/api/departments"
        title="Departments"
        description="Company structure"
        addButtonLabel="Add department"
        cardIcon="apartment"
        emptyState={{ icon: 'domain_disabled', title: 'Empty', description: 'No records' }}
        loadingState={{ icon: 'hourglass_top', title: 'Loading', description: 'Please wait' }}
        errorTitle="Failed to load"
        currentUser={{ role: 'admin' }}
        isActive={true}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        getItemTitle={record => record.name}
        getItemDescription={record => record.description}
        getDeleteLabel={record => record.name}
        renderMeta={record => (
          <>
            <span>{record.head_name}</span>
            <span>{record.employee_count}</span>
          </>
        )}
      />
    );

    expect(container.querySelector('.page-header')).toBeInTheDocument();
    expect(container.querySelector('.page-actions.organization-page-actions')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.page-content.organization-page-content')).toBeInTheDocument();
      expect(container.querySelector('.grid-cards.grid-cards--organization')).toBeInTheDocument();
    });

    expect(container.querySelector('.grid-cards--organization .grid-card .meta-row')).toBeInTheDocument();
  });
});
