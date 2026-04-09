# HR System Frontend Dedup Cleanup Implementation Plan

**Goal:** Reduce low-value frontend duplication without hiding page behavior behind heavy abstractions.
**Context:** The frontend already extracts some shared UI, but `useAppDataController` and `useAppActionsController` still repeat the same state and action patterns in several places.
**Execution:** Implement directly in this session, then verify with `npm run test:frontend`.

## Task 1: Simplify repeated snapshot transitions in `useAppDataController`

**Goal** — Keep the same page snapshot behavior while removing repeated loading/ready/error helper branches.
**Files** — Inspect and modify `frontend/src/hooks/useAppDataController.js`
**Approach** — Introduce a small, local page config/helper structure inside the hook so dashboard, development, and onboarding reuse the same transition logic and keep page-specific loaders/messages explicit.
**Verification** — Run `npm run test:frontend`
**Done when** — The hook still exposes the same public API and page loading behavior, but repeated transition helpers are reduced.
**Notes** — Avoid moving this logic into a separate file; the goal is fewer concepts, not just fewer lines.

## Task 2: Simplify repeated admin/modal action patterns in `useAppActionsController`

**Goal** — Remove repetitive open/edit admin action boilerplate and centralize repeated endpoint/cache refresh maps.
**Files** — Inspect and modify `frontend/src/hooks/useAppActionsController.js`
**Approach** — Add local helper builders for admin-gated modal state changes and consolidate repeated endpoint/cache invalidation lookups while preserving existing exported action names.
**Verification** — Run `npm run test:frontend`
**Done when** — The hook still returns the same action surface, but repeated open/edit/delete/move setup code is reduced.
**Notes** — Keep action names explicit for readability in `App.jsx` and tests.

## Task 3: Verify the refactor against the current frontend suite

**Goal** — Confirm behavior is preserved after cleanup.
**Files** — Inspect test output from `frontend/src/test/*` through the existing test runner.
**Approach** — Run the repo’s frontend test command and read the real result before claiming success.
**Verification** — Run `npm run test:frontend`
**Done when** — Frontend tests pass in the current repo state.
**Notes** — If a test fails, stop and fix or report the real remaining issue.
