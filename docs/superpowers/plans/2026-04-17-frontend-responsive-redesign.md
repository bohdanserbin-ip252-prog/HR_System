# Frontend Responsive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the HR System frontend responsive layout for desktop, tablet, and mobile using shared shell, data-page, detail-page, and modal patterns without changing business logic.

**Architecture:** Keep the existing React page/component tree, but replace fragmented layout behavior with a small set of reusable responsive patterns. The implementation stays CSS-first where possible, introduces a few presentational helper components for testability, and preserves all existing data-loading and mutation flows.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, layered CSS in `frontend/src/styles/*.css`

---

## File Structure

### Core files to modify

- `frontend/src/App.jsx`
- `frontend/src/components/AppShell.jsx`
- `frontend/src/components/DashboardPage.jsx`
- `frontend/src/components/EmployeesPage.jsx`
- `frontend/src/components/OrganizationPage.jsx`
- `frontend/src/components/OnboardingPage.jsx`
- `frontend/src/components/DevelopmentPage.jsx`
- `frontend/src/components/ProfilePage.jsx`
- `frontend/src/components/ModalFrame.jsx`
- `frontend/src/components/ConfirmDeleteModal.jsx`
- `frontend/src/components/DepartmentModal.jsx`
- `frontend/src/components/PositionModal.jsx`
- `frontend/src/components/EmployeeModal.jsx`
- `frontend/src/components/GoalModal.jsx`
- `frontend/src/components/FeedbackModal.jsx`
- `frontend/src/components/MeetingModal.jsx`
- `frontend/src/components/TaskModal.jsx`
- `frontend/src/components/employees/EmployeesTable.jsx`
- `frontend/src/components/employees/EmployeesToolbar.jsx`
- `frontend/src/components/profile/ProfileMain.jsx`
- `frontend/src/components/employeeModal/EmployeeModalForm.jsx`
- `frontend/src/styles/01-base.css`
- `frontend/src/styles/03-layout-shell.css`
- `frontend/src/styles/04-layout-nav-content.css`
- `frontend/src/styles/05-dashboard-cards.css`
- `frontend/src/styles/06-table-organization.css`
- `frontend/src/styles/07-modals-onboarding.css`
- `frontend/src/styles/08-onboarding-sections.css`
- `frontend/src/styles/09-development-goals.css`
- `frontend/src/styles/10-development-feedback-meetings.css`
- `frontend/src/styles/11-profile-main.css`
- `frontend/src/styles/12-profile-details.css`
- `frontend/src/styles/13-responsive.css`

### New files to create

- `frontend/src/components/employees/EmployeesCardList.jsx`
- `frontend/src/components/employees/EmployeesResults.jsx`
- `frontend/src/test/employees-responsive.test.jsx`
- `frontend/src/test/data-pages-responsive.test.jsx`
- `frontend/src/test/detail-pages-responsive.test.jsx`
- `frontend/src/test/modal-frame-responsive.test.jsx`

### Existing tests to extend

- `frontend/src/test/shell-components.test.jsx`
- `frontend/src/test/app-auth-flow.test.jsx`

## Task 1: Build the responsive shell foundation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/AppShell.jsx`
- Modify: `frontend/src/styles/01-base.css`
- Modify: `frontend/src/styles/03-layout-shell.css`
- Modify: `frontend/src/styles/04-layout-nav-content.css`
- Modify: `frontend/src/styles/13-responsive.css`
- Test: `frontend/src/test/shell-components.test.jsx`

- [ ] **Step 1: Write the failing shell tests**

```jsx
it('renders an accessible drawer toggle and backdrop for non-profile pages', () => {
    const { container, props } = renderAppShell({ currentPage: 'employees', isSidebarOpen: true });

    expect(screen.getByRole('button', { name: 'Відкрити навігацію' })).toBeInTheDocument();
    expect(container.querySelector('.sidebar-backdrop')).toBeInTheDocument();

    fireEvent.click(container.querySelector('.sidebar-backdrop'));
    expect(props.onToggleSidebar).toHaveBeenCalledTimes(1);
});

it('marks the shell with responsive state classes', () => {
    const { container } = renderAppShell({ currentPage: 'profile', isSidebarOpen: false });
    expect(container.querySelector('.app-shell')).toHaveClass('app-shell--profile');
});
```

- [ ] **Step 2: Run the shell test file and confirm it fails**

Run:

```bash
npm run test --workspace frontend -- --run src/test/shell-components.test.jsx
```

Expected: FAIL because `AppShell` does not yet render a backdrop, does not expose an accessible menu label, and does not apply shell state classes.

- [ ] **Step 3: Implement shell state and drawer markup**

Update `AppShell.jsx` and `App.jsx` so the shell root becomes stateful and the drawer can behave like a real tablet/mobile navigation layer.

```jsx
const shellClassName = [
  'app-shell',
  isSidebarOpen ? 'app-shell--sidebar-open' : '',
  isProfilePage ? 'app-shell--profile' : ''
].filter(Boolean).join(' ');

<div className={shellClassName} data-visible={isVisible ? 'true' : 'false'}>
  <header className="top-header">
    <button
      id="menuBtn"
      aria-label="Відкрити навігацію"
      onClick={onToggleSidebar}
      type="button"
    >
      <span className="material-symbols-outlined">menu</span>
    </button>
  </header>

  {!isProfilePage ? (
    <>
      <aside className={`sidebar${isSidebarOpen ? ' open' : ''}`} id="sidebar">...</aside>
      <button
        aria-label="Закрити навігацію"
        className={`sidebar-backdrop${isSidebarOpen ? ' active' : ''}`}
        onClick={onToggleSidebar}
        type="button"
      />
    </>
  ) : null}
</div>
```

Add a body side effect in `App.jsx` so tablet/mobile drawer mode can lock body scroll:

```jsx
useEffect(() => {
  document.body.classList.toggle('sidebar-open', isSidebarOpen);
  return () => document.body.classList.remove('sidebar-open');
}, [isSidebarOpen]);
```

- [ ] **Step 4: Implement the shell tokens and drawer CSS**

Introduce responsive shell tokens in `01-base.css`, then wire the drawer/backdrop/header/FAB behavior in the shell styles.

```css
:root {
  --page-pad-x: clamp(16px, 3vw, 40px);
  --page-pad-y: 24px;
  --content-max-width: 1440px;
  --sidebar-width-desktop: 260px;
  --sidebar-width-drawer: min(86vw, 320px);
  --fab-offset-x: max(16px, env(safe-area-inset-right));
  --fab-offset-y: max(16px, calc(16px + env(safe-area-inset-bottom)));
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-backdrop.active {
  opacity: 1;
  pointer-events: auto;
}

@media (max-width: 1024px) {
  .sidebar {
    width: var(--sidebar-width-drawer);
    transform: translateX(-100%);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}
```

- [ ] **Step 5: Re-run the shell tests**

Run:

```bash
npm run test --workspace frontend -- --run src/test/shell-components.test.jsx
```

Expected: PASS with updated shell classes, menu button semantics, and backdrop behavior.

- [ ] **Step 6: Commit the shell foundation**

```bash
git add frontend/src/App.jsx frontend/src/components/AppShell.jsx frontend/src/styles/01-base.css frontend/src/styles/03-layout-shell.css frontend/src/styles/04-layout-nav-content.css frontend/src/styles/13-responsive.css frontend/src/test/shell-components.test.jsx
git commit -m "feat: add responsive shell foundation"
```

## Task 2: Implement the employees hybrid tablet/mobile presentation

**Files:**
- Create: `frontend/src/components/employees/EmployeesCardList.jsx`
- Create: `frontend/src/components/employees/EmployeesResults.jsx`
- Create: `frontend/src/test/employees-responsive.test.jsx`
- Modify: `frontend/src/components/EmployeesPage.jsx`
- Modify: `frontend/src/components/employees/EmployeesTable.jsx`
- Modify: `frontend/src/components/employees/EmployeesToolbar.jsx`
- Modify: `frontend/src/styles/06-table-organization.css`
- Modify: `frontend/src/styles/13-responsive.css`

- [ ] **Step 1: Write failing tests for the hybrid employees view**

Create `frontend/src/test/employees-responsive.test.jsx` with a pure presentational test around a new `EmployeesResults` wrapper.

```jsx
it('renders both the table shell and mobile card list from one data source', () => {
    render(
        <EmployeesResults
            employees={[sampleEmployee]}
            isLoading={false}
            errorMessage=""
            isAdmin={true}
            sortBy="last_name"
            setSortBy={vi.fn()}
            setSortDir={vi.fn()}
            openProfile={vi.fn()}
            editEmployee={vi.fn()}
            confirmDelete={vi.fn()}
        />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByTestId('employees-card-list')).toBeInTheDocument();
    expect(screen.getAllByText(/Коваленко Олександр/)).toHaveLength(2);
});
```

- [ ] **Step 2: Run the employees responsive test and confirm it fails**

Run:

```bash
npm run test --workspace frontend -- --run src/test/employees-responsive.test.jsx
```

Expected: FAIL because `EmployeesResults` and `EmployeesCardList` do not exist yet.

- [ ] **Step 3: Extract a shared employees results layer**

Create a wrapper that owns the shared `PageStateBoundary` and renders both the compact-table shell and the mobile cards from the same props.

```jsx
export default function EmployeesResults(props) {
  const { employees, isLoading, errorMessage } = props;

  return (
    <>
      <div className="employees-table-view">
        <EmployeesTable {...props} />
      </div>
      <div className="employees-card-view" data-testid="employees-card-list">
        <EmployeesCardList {...props} />
      </div>
      <PageStateBoundary
        loading={isLoading ? loadingState : null}
        error={!isLoading && errorMessage ? errorState : null}
        empty={!isLoading && !errorMessage && employees.length === 0 ? emptyState : null}
      />
    </>
  );
}
```

Refactor `EmployeesTable.jsx` so it only renders the table shell:

```jsx
export default function EmployeesTable({ employees, isAdmin, sortBy, setSortBy, setSortDir, openProfile, editEmployee, confirmDelete }) {
  return (
    <div className="employees-table-shell">
      <table className="data-table data-table--employees">...</table>
    </div>
  );
}
```

Wire `EmployeesPage.jsx` to use `EmployeesResults` instead of calling `EmployeesTable` directly.

- [ ] **Step 4: Add the tablet and mobile employees CSS**

Implement the hybrid view with CSS rather than JavaScript viewport detection.

```css
.employees-table-view {
  display: block;
}

.employees-card-view {
  display: none;
}

.employees-table-shell {
  overflow-x: auto;
}

.employees-toolbar {
  display: grid;
  gap: var(--toolbar-gap);
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(220px, 1fr));
}

@media (max-width: 1024px) {
  .employees-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .data-table--employees {
    min-width: 860px;
  }
}

@media (max-width: 767px) {
  .employees-table-view {
    display: none;
  }

  .employees-card-view {
    display: grid;
    gap: var(--card-gap);
  }
}
```

Rename the toolbar wrapper class in `EmployeesToolbar.jsx`:

```jsx
<div className="toolbar employees-toolbar">
```

- [ ] **Step 5: Re-run the employees responsive test**

Run:

```bash
npm run test --workspace frontend -- --run src/test/employees-responsive.test.jsx
```

Expected: PASS with one shared data source and two presentational layers.

- [ ] **Step 6: Commit the employees responsive layer**

```bash
git add frontend/src/components/EmployeesPage.jsx frontend/src/components/employees/EmployeesTable.jsx frontend/src/components/employees/EmployeesToolbar.jsx frontend/src/components/employees/EmployeesCardList.jsx frontend/src/components/employees/EmployeesResults.jsx frontend/src/styles/06-table-organization.css frontend/src/styles/13-responsive.css frontend/src/test/employees-responsive.test.jsx
git commit -m "feat: add responsive employees data views"
```

## Task 3: Convert dashboard and organization screens to shared data-page layouts

**Files:**
- Create: `frontend/src/test/data-pages-responsive.test.jsx`
- Modify: `frontend/src/components/DashboardPage.jsx`
- Modify: `frontend/src/components/OrganizationPage.jsx`
- Modify: `frontend/src/styles/05-dashboard-cards.css`
- Modify: `frontend/src/styles/06-table-organization.css`
- Modify: `frontend/src/styles/13-responsive.css`

- [ ] **Step 1: Write failing tests for the new data-page wrappers**

Create `frontend/src/test/data-pages-responsive.test.jsx`.

```jsx
it('renders the dashboard inside shared responsive page sections', () => {
    render(<DashboardPage isActive={true} snapshot={dashboardSnapshot} />);

    expect(document.querySelector('.page-content.dashboard-content')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-kpi-grid')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the data-page responsive test and confirm it fails**

Run:

```bash
npm run test --workspace frontend -- --run src/test/data-pages-responsive.test.jsx
```

Expected: FAIL because the new wrapper classes are not yet present.

- [ ] **Step 3: Move dashboard and organization pages onto shared layout classes**

Refactor `DashboardPage.jsx` and `OrganizationPage.jsx` to expose stable layout class hooks instead of inline wrappers.

```jsx
<div className="page-header">...</div>
<div className="page-actions organization-page-actions">...</div>
<div className="page-content organization-page-content">
  <div className="grid-cards grid-cards--organization">...</div>
</div>
```

```jsx
<div className="page-content dashboard-content">
  <div className="dashboard-grid">
    <div className="dashboard-left">
      <div className="dashboard-kpi-grid">...</div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Implement responsive card-grid and action-bar rules**

Use shared data-page CSS for dashboard and organization screens.

```css
.page-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.dashboard-kpi-grid {
  display: grid;
  gap: var(--card-gap);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.grid-cards--organization {
  display: grid;
  gap: var(--card-gap);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-card .meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1024px) {
  .grid-cards--organization {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .page-actions {
    display: grid;
  }

  .grid-cards--organization {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Re-run the data-page responsive test**

Run:

```bash
npm run test --workspace frontend -- --run src/test/data-pages-responsive.test.jsx
```

Expected: PASS with shared layout hooks present in the dashboard markup.

- [ ] **Step 6: Commit the data-page layout changes**

```bash
git add frontend/src/components/DashboardPage.jsx frontend/src/components/OrganizationPage.jsx frontend/src/styles/05-dashboard-cards.css frontend/src/styles/06-table-organization.css frontend/src/styles/13-responsive.css frontend/src/test/data-pages-responsive.test.jsx
git commit -m "feat: add responsive data page layout patterns"
```

## Task 4: Restructure profile, onboarding, and development screens for tablet and mobile

**Files:**
- Create: `frontend/src/test/detail-pages-responsive.test.jsx`
- Modify: `frontend/src/components/ProfilePage.jsx`
- Modify: `frontend/src/components/profile/ProfileMain.jsx`
- Modify: `frontend/src/components/OnboardingPage.jsx`
- Modify: `frontend/src/components/DevelopmentPage.jsx`
- Modify: `frontend/src/styles/08-onboarding-sections.css`
- Modify: `frontend/src/styles/09-development-goals.css`
- Modify: `frontend/src/styles/10-development-feedback-meetings.css`
- Modify: `frontend/src/styles/11-profile-main.css`
- Modify: `frontend/src/styles/12-profile-details.css`
- Modify: `frontend/src/styles/13-responsive.css`

- [ ] **Step 1: Write failing tests for the detail-page class extraction**

Create `frontend/src/test/detail-pages-responsive.test.jsx`.

```jsx
it('renders profile personal info with a responsive grid class instead of inline columns', () => {
    render(<ProfileMain employee={employee} tenure={tenure} />);
    expect(document.querySelector('.profile-info-grid')).toBeInTheDocument();
});

it('renders onboarding and development section wrappers for responsive stacking', () => {
    render(<OnboardingPage currentUser={{ role: 'admin' }} isActive={true} snapshot={onboardingSnapshot} />);
    expect(document.querySelector('.onboarding-content')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the detail-page test and confirm it fails**

Run:

```bash
npm run test --workspace frontend -- --run src/test/detail-pages-responsive.test.jsx
```

Expected: FAIL because `ProfileMain` still uses inline grid styles and the new wrapper classes do not exist.

- [ ] **Step 3: Extract responsive class hooks from detail-page JSX**

Replace inline layout styles with named classes in profile, onboarding, and development screens.

```jsx
<div className="profile-info-grid">
  <div className="profile-info-item">...</div>
</div>

<div className="ob-bento onboarding-content">...</div>

<div className="dev-grid development-content">...</div>
```

Move the profile journey header off inline layout too:

```jsx
<div className="profile-section-head">
  <h2 className="profile-section-title">...</h2>
  <span className="badge badge-active" id="profileJourneyBadge">{tenure.tenureLabel}</span>
</div>
```

- [ ] **Step 4: Implement responsive detail-page CSS**

Add stable breakpoint behavior to the detail pages.

```css
.profile-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.profile-section-head,
.dev-goal-card,
.ob-task {
  display: flex;
  gap: 16px;
}

@media (max-width: 1024px) {
  .profile-layout {
    display: flex;
    flex-direction: column;
  }

  .ob-bento,
  .dev-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .profile-info-grid,
  .profile-focus-grid {
    grid-template-columns: 1fr;
  }

  .profile-section-head,
  .dev-goal-card,
  .ob-task {
    flex-direction: column;
  }
}
```

- [ ] **Step 5: Re-run the detail-page responsive test**

Run:

```bash
npm run test --workspace frontend -- --run src/test/detail-pages-responsive.test.jsx
```

Expected: PASS with explicit responsive class hooks in detail-page components.

- [ ] **Step 6: Commit the detail-page responsive work**

```bash
git add frontend/src/components/ProfilePage.jsx frontend/src/components/profile/ProfileMain.jsx frontend/src/components/OnboardingPage.jsx frontend/src/components/DevelopmentPage.jsx frontend/src/styles/08-onboarding-sections.css frontend/src/styles/09-development-goals.css frontend/src/styles/10-development-feedback-meetings.css frontend/src/styles/11-profile-main.css frontend/src/styles/12-profile-details.css frontend/src/styles/13-responsive.css frontend/src/test/detail-pages-responsive.test.jsx
git commit -m "feat: add responsive detail page layouts"
```

## Task 5: Replace fixed modal widths with adaptive modal variants

**Files:**
- Create: `frontend/src/test/modal-frame-responsive.test.jsx`
- Modify: `frontend/src/components/ModalFrame.jsx`
- Modify: `frontend/src/components/ConfirmDeleteModal.jsx`
- Modify: `frontend/src/components/DepartmentModal.jsx`
- Modify: `frontend/src/components/PositionModal.jsx`
- Modify: `frontend/src/components/EmployeeModal.jsx`
- Modify: `frontend/src/components/GoalModal.jsx`
- Modify: `frontend/src/components/FeedbackModal.jsx`
- Modify: `frontend/src/components/MeetingModal.jsx`
- Modify: `frontend/src/components/TaskModal.jsx`
- Modify: `frontend/src/components/employeeModal/EmployeeModalForm.jsx`
- Modify: `frontend/src/styles/07-modals-onboarding.css`
- Modify: `frontend/src/styles/13-responsive.css`

- [ ] **Step 1: Write failing tests for modal size variants**

Create `frontend/src/test/modal-frame-responsive.test.jsx`.

```jsx
it('applies semantic modal size classes instead of inline widths', () => {
    render(
        <ModalFrame
            modalId="testModal"
            title="Тест"
            size="wide"
            isOpen={true}
            onClose={vi.fn()}
            footer={<button type="button">Закрити</button>}
        >
            <div>body</div>
        </ModalFrame>
    );

    expect(document.querySelector('.modal')).toHaveClass('modal--wide');
    expect(document.querySelector('.modal')).not.toHaveStyle({ width: '720px' });
});
```

- [ ] **Step 2: Run the modal responsive test and confirm it fails**

Run:

```bash
npm run test --workspace frontend -- --run src/test/modal-frame-responsive.test.jsx
```

Expected: FAIL because `ModalFrame` still accepts `width` and applies it inline.

- [ ] **Step 3: Convert `ModalFrame` to size variants and update modal callers**

Change `ModalFrame` to accept a semantic `size` prop.

```jsx
export default function ModalFrame({
  modalId,
  title,
  size = 'standard',
  isOpen,
  onClose,
  children,
  footer
}) {
  return createPortal(
    <div className="modal-overlay active" id={modalId}>
      <div className={`modal modal--${size}`}>...</div>
    </div>,
    document.body
  );
}
```

Update callers:

```jsx
<ModalFrame size="compact" ... />
<ModalFrame size="standard" ... />
<ModalFrame size="wide" ... />
```

Update `EmployeeModalForm.jsx` so it uses the same `form-row` class that the modal CSS will collapse on tablet/mobile.

- [ ] **Step 4: Implement the adaptive modal CSS**

```css
.modal {
  width: min(var(--modal-width, 560px), 94vw);
  max-height: min(92vh, 960px);
  display: flex;
  flex-direction: column;
}

.modal--compact {
  --modal-width: 400px;
}

.modal--standard {
  --modal-width: 560px;
}

.modal--wide {
  --modal-width: 720px;
}

.modal-body {
  overflow: auto;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 1024px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Re-run the modal responsive test**

Run:

```bash
npm run test --workspace frontend -- --run src/test/modal-frame-responsive.test.jsx
```

Expected: PASS with semantic modal sizing and responsive form rows.

- [ ] **Step 6: Commit the modal system**

```bash
git add frontend/src/components/ModalFrame.jsx frontend/src/components/ConfirmDeleteModal.jsx frontend/src/components/DepartmentModal.jsx frontend/src/components/PositionModal.jsx frontend/src/components/EmployeeModal.jsx frontend/src/components/GoalModal.jsx frontend/src/components/FeedbackModal.jsx frontend/src/components/MeetingModal.jsx frontend/src/components/TaskModal.jsx frontend/src/components/employeeModal/EmployeeModalForm.jsx frontend/src/styles/07-modals-onboarding.css frontend/src/styles/13-responsive.css frontend/src/test/modal-frame-responsive.test.jsx
git commit -m "feat: add adaptive modal sizing"
```

## Task 6: Run the responsive verification sweep

**Files:**
- Inspect: `frontend/src/test/shell-components.test.jsx`
- Inspect: `frontend/src/test/app-auth-flow.test.jsx`
- Inspect: `frontend/src/test/employees-responsive.test.jsx`
- Inspect: `frontend/src/test/data-pages-responsive.test.jsx`
- Inspect: `frontend/src/test/detail-pages-responsive.test.jsx`
- Inspect: `frontend/src/test/modal-frame-responsive.test.jsx`

- [ ] **Step 1: Run the focused responsive and shell tests**

Run:

```bash
npm run test --workspace frontend -- --run src/test/shell-components.test.jsx src/test/app-auth-flow.test.jsx src/test/employees-responsive.test.jsx src/test/data-pages-responsive.test.jsx src/test/detail-pages-responsive.test.jsx src/test/modal-frame-responsive.test.jsx
```

Expected: PASS across the targeted shell, auth, data-page, detail-page, and modal tests.

- [ ] **Step 2: Run the full frontend suite**

Run:

```bash
npm run test:frontend
```

Expected: PASS with no regressions in the existing frontend tests.

- [ ] **Step 3: Run the frontend build**

Run:

```bash
npm run build --workspace frontend
```

Expected: PASS with a successful Vite production build.

- [ ] **Step 4: Run the repo line-limit check**

Run:

```bash
npm run check:max-lines
```

Expected: PASS, or a real file-length failure that must be fixed before completion.

- [ ] **Step 5: Perform manual viewport QA**

Run the app locally:

```bash
npm run dev --workspace frontend
```

Verify these viewport widths in browser devtools:

- `1440`
- `1200`
- `1024`
- `900`
- `768`
- `430`
- `390`
- `360`

Check:

- login layout
- shell open/close behavior
- employees table on tablet
- employees cards on mobile
- departments and positions card layout
- dashboard KPI flow
- profile summary stacking
- onboarding stepper readability
- development cards wrapping
- modal scrolling and footer wrapping

- [ ] **Step 6: Commit any final verification fixes**

```bash
git add frontend/src
git commit -m "test: verify responsive frontend redesign"
```
