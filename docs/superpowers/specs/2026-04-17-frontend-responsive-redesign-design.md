# Frontend Responsive Redesign Design

**Date:** 2026-04-17
**Project:** HR System frontend
**Status:** Draft approved in chat, written for review

## Goal

Rebuild the frontend responsive layout system so the entire HR System works cleanly on desktop, tablet, and mobile without changing business logic. The redesign should replace fragmented page-by-page media-query fixes with a consistent set of responsive layout patterns shared across shell navigation, data-heavy screens, detail screens, and modals.

## Scope

This design includes:

- a global responsive breakpoint and spacing system
- adaptive shell/navigation behavior
- responsive restructuring for dashboard, employees, departments, and positions
- a hybrid employees presentation model: tablet uses a compact table, mobile uses cards
- responsive restructuring for profile, onboarding, and development screens
- an adaptive modal sizing and form layout system

This design does not include:

- changes to backend behavior or API contracts
- changes to data-loading hooks unless required only to support view switching
- a full visual rebrand or new design language
- unrelated refactors outside responsive layout needs

## Current Problems

The current frontend has a partial responsive layer in [frontend/src/styles/13-responsive.css](/home/tetra/Desktop/Projects/University/Script_Programming/HR_System/frontend/src/styles/13-responsive.css), but the layout system is still fragmented.

Observed issues from code review:

- shell behavior changes only at two breakpoints and lacks a proper tablet model
- mobile sidebar behaves like an off-canvas panel without backdrop or scroll locking
- `main-content` geometry depends on desktop assumptions and inline exceptions
- data-heavy screens mix tables, cards, toolbars, and actions without shared responsive patterns
- employees table is not designed for a compact tablet mode or a dedicated mobile presentation
- profile and modal layouts still depend on inline widths and inline grid definitions
- onboarding and development sections have desktop-first row structures that become fragile on smaller screens

## Responsive Strategy

The redesign uses one shared responsive system across the whole frontend.

### Breakpoints

Four viewport tiers are adopted:

- `Desktop`: wider than `1200px`
- `Laptop / Small Desktop`: `1025px` to `1200px`
- `Tablet`: `768px` to `1024px`
- `Mobile`: `767px` and below

These tiers replace the current dependence on only `1024px` and `640px`.

### Global Layout Tokens

Global layout variables should live in [frontend/src/styles/01-base.css](/home/tetra/Desktop/Projects/University/Script_Programming/HR_System/frontend/src/styles/01-base.css).

Planned tokens:

- `--page-pad-x`
- `--page-pad-y`
- `--content-max-width`
- `--toolbar-gap`
- `--card-gap`
- `--section-gap`
- `--modal-width`
- `--fab-offset-x`
- `--fab-offset-y`
- `--sidebar-width-desktop`
- `--sidebar-width-drawer`

These tokens become the single source of truth for spacing and sizing rather than scattered local values and inline styles.

### Shared Responsive Modes

Major UI blocks should follow one of three presentation modes:

- `stack` for mobile
- `compact grid` for tablet
- `full row/grid` for desktop and laptop

This rule applies to headers, action bars, toolbars, section grids, and detail panels.

## Shell And Navigation Design

The app shell in [frontend/src/components/AppShell.jsx](/home/tetra/Desktop/Projects/University/Script_Programming/HR_System/frontend/src/components/AppShell.jsx) should become a stable responsive container instead of relying on mixed inline styles and CSS overrides.

### Desktop Behavior

- the sidebar remains persistently visible
- `main-content` has a stable left offset controlled only by CSS
- top navigation can remain visible as a secondary navigation layer
- profile pages use a shell state variant rather than inline margin exceptions

### Tablet And Mobile Behavior

- the sidebar becomes a drawer
- a backdrop appears when the drawer is open
- clicking the backdrop closes the drawer
- pressing `Esc` closes the drawer
- body scroll is locked while the drawer is open
- the drawer width is based on a capped viewport-relative width instead of the desktop sidebar width

### Shell State Model

Introduce explicit shell state classes:

- `app-shell--sidebar-open`
- `app-shell--profile`
- optional future `app-shell--sidebar-collapsed`

Responsive behavior should be controlled through stateful classes and CSS, not inline layout overrides.

### Header And FAB

- header horizontal padding scales down for tablet and mobile
- the menu button becomes a first-class mobile navigation control with accessible labeling and focus states
- the FAB keeps its global role but gains safe-area-aware offsets for mobile devices

## Shared Page Layout System

All content pages should align to a common layout structure:

- `page-header`
- `page-actions`
- `page-toolbar`
- `page-content`

This pattern replaces one-off combinations such as local `card-header-bar`, inline action wrappers, and per-page spacing hacks.

The page layout system should guarantee:

- consistent vertical rhythm
- consistent max content width
- predictable spacing between header, controls, and content
- reusable breakpoint behavior

## Data-Heavy Screen Design

This section applies to the dashboard, employees, departments, and positions flows.

### Dashboard

The dashboard should preserve its strong desktop visual hierarchy but become more fluid below desktop.

Desktop:

- retain a two-column composition with primary KPI content and a secondary directives panel

Tablet:

- allow the right panel to drop below the primary KPI zone when needed
- convert KPI groups to `auto-fit/minmax(...)` based grids
- reduce spacing and hero typography without collapsing the page into a cramped layout

Mobile:

- use a single-column stack
- scale large numbers with `clamp(...)`
- ensure KPI cards, mini-stat cards, and directive items use shared card-grid rules rather than isolated overrides

### Employees

Employees use the agreed hybrid responsive model.

Desktop:

- keep the existing full table presentation

Tablet:

- use a compact table layout
- preserve table semantics for scanning and comparison
- reduce column density by compressing or de-emphasizing less critical fields
- wrap the table in a horizontal overflow shell to prevent layout breakage
- place toolbar controls in a compact multi-column grid

Mobile:

- switch from table presentation to employee cards
- each employee card should present identity, status, department, position, compensation summary, and primary actions in a readable vertical hierarchy
- actions must remain obvious and reachable without horizontal scrolling

Both tablet and mobile views should read from the same employees data source; only the presentation layer changes.

### Toolbar Pattern

Toolbars such as [frontend/src/components/employees/EmployeesToolbar.jsx](/home/tetra/Desktop/Projects/University/Script_Programming/HR_System/frontend/src/components/employees/EmployeesToolbar.jsx) should use one shared responsive model.

Desktop:

- single row or wide multi-column layout

Tablet:

- compact two-column grid

Mobile:

- single-column stacked controls

Additional rules:

- search remains the highest-priority control
- controls should share aligned heights and spacing
- dropdowns must stay within the viewport

### Departments And Positions

Departments and positions should use a stable card-grid model rather than relying on desktop card sizing with light responsive overrides.

Desktop:

- two or three columns depending on available width

Tablet:

- two columns

Mobile:

- one column

Card metadata rows must wrap correctly, and action controls must not break the card header when text becomes long.

## Detail Screen Design

This section applies to profile, onboarding, and development screens.

### Profile

Desktop:

- keep the two-column summary-plus-detail model

Tablet:

- move the summary/sidebar content above the main detail content as a full-width panel

Mobile:

- use a single-column layout everywhere
- replace inline personal-info grids with responsive CSS classes

Additional profile requirements:

- timeline spacing should tighten on smaller screens
- decorative line treatments should not create excessive empty space on mobile
- focus and detail grids should collapse cleanly to one column

### Onboarding

Desktop:

- keep the current hero, full stepper, and two-column content structure

Tablet:

- stack tasks above contextual cards or use an asymmetric single-column flow
- simplify stepper density

Mobile:

- fully stack tasks and contextual cards
- ensure each onboarding task becomes a readable vertical card with non-conflicting status and actions

### Onboarding Stepper

The onboarding stepper needs three presentation modes:

- desktop: full horizontal stepper with supporting labels
- tablet: compact horizontal stepper with reduced supporting text
- mobile: compact mode with shortened labels or a vertical/scrollable representation

### Development

Desktop:

- keep the two-column `goals + mentorship` structure

Tablet:

- keep section separation, but allow internal rows to wrap

Mobile:

- stack the page into one column

Development cards must support:

- wrapped right-side content
- progress and action sections that can move below the primary content
- reduced hero typography on smaller screens

## Modal Design

Modal responsiveness is a critical requirement because several current modals use fixed inline widths.

### Modal Sizing Model

Replace pixel-based inline widths with size variants:

- `modal--compact`
- `modal--standard`
- `modal--wide`

The modal container should use a viewport-aware width rule such as:

- width constrained by `min(var(--modal-width), 94vw)`
- capped height with internal scrolling

### Modal Behavior

- modal body scrolls inside the modal, not through uncontrolled viewport growth
- modal footer actions may wrap when needed
- modal padding and spacing compress on smaller screens without harming readability

### Responsive Form Rules

Forms should use a shared responsive form-row system.

Desktop:

- two-column rows where appropriate

Tablet and Mobile:

- single-column form rows

This applies especially to employee and other administrative modals where dense two-column forms are not appropriate on smaller screens.

## Design Units To Introduce

The redesign should standardize around reusable layout units rather than page-specific hacks.

Proposed units:

- `app shell`
- `page layout`
- `action bar`
- `toolbar grid`
- `table shell`
- `card list shell`
- `detail layout`
- `summary panel`
- `responsive form row`
- `adaptive modal size`

These may be implemented as CSS patterns, component wrappers, or a combination of both, depending on the existing code structure.

## Implementation Order

Implementation should proceed in layers so that later work builds on stable responsive primitives.

1. global tokens and responsive rules
2. shell and navigation
3. data-heavy pages
4. detail pages
5. modal system

This order minimizes rework and reduces the chance of conflicting layout overrides.

## Validation Plan

Responsive verification should cover both layout integrity and interaction behavior.

### Viewports

Validate at minimum:

- `1440+`
- `1200`
- `1024`
- `900`
- `768`
- `430`
- `390`
- `360`

### Critical Scenarios

- login screen layout
- sidebar open and close behavior
- navigation between pages
- employees filters, sorting, tablet table mode, and mobile card mode
- departments and positions CRUD entry points
- onboarding task actions
- development actions
- profile readability and hierarchy
- modal opening, scrolling, action placement, and form layout

### Acceptance Criteria

- no critical horizontal layout breakage on target viewports
- no unreachable primary actions on touch devices
- drawer navigation behaves predictably with overlay and scroll lock
- modals remain fully usable on mobile and tablet
- data-heavy screens preserve readability without forcing desktop layouts onto phones

## Risks And Constraints

- the repo already contains unrelated in-progress frontend and backend changes, so implementation must avoid reverting or overwriting those edits
- responsive changes may require coordinated JSX and CSS updates rather than CSS-only patches
- employees tablet/mobile split is the most behaviorally sensitive frontend change and needs careful testing to preserve actions and sorting

## Recommended Next Step

After review of this design document, write a detailed implementation plan that maps the redesign into concrete file-level tasks and verification steps before any frontend code changes begin.
