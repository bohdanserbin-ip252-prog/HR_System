# Frontend Motion And Dedup Implementation Plan

**Goal:** Stabilize UI motion and remove obvious frontend styling duplication without changing business behavior.
**Context:** The frontend already has modular CSS, but motion rules and some page styles are split across multiple truth sources.
**Execution:** Implement directly in this session in small batches, with frontend tests/build after CSS and import changes.

## Task 1: Add Shared Motion Tokens

**Goal** — Provide one canonical source for animation durations, easings, and reusable keyframes.
**Files** — Modify `frontend/src/styles/01-base.css`.
**Approach** — Add CSS variables for motion timing/easing and shared keyframes for entrance, toast exit, spin, and skeleton pulse. Add a global `prefers-reduced-motion: reduce` block.
**Verification** — Run the focused frontend suite with `npm test` from `frontend/` after implementation.
**Done when** — Feature CSS can reference shared motion tokens instead of declaring competing values.
**Notes** — Keep the tokens small; avoid introducing a new framework or extra build dependency.

## Task 2: Centralize Style Imports

**Goal** — Make `frontend/src/style.css` the only stylesheet entrypoint for page styles.
**Files** — Modify `frontend/src/style.css`, `frontend/src/components/RecruitmentPage.jsx`, and `frontend/src/components/SurveysPage.jsx`.
**Approach** — Import `19-recruitment-ux.css` and `20-surveys-ux.css` from the global stylesheet, then remove direct CSS imports from page components.
**Verification** — Run `npm test` from `frontend/`.
**Done when** — All page CSS files under `frontend/src/styles` are reachable from `style.css`, and components no longer own CSS side effects for recruitment/surveys.
**Notes** — Keep the current late import order so these page-specific styles keep their existing precedence.

## Task 3: Replace Local Motion Duplicates

**Goal** — Use the shared motion system for existing animations.
**Files** — Modify `05-dashboard-cards.css`, `06-table-organization.css`, `06c-skeleton.css`, `07-modals-onboarding.css`, `16b-hub-tabs.css`, and `toast.ts`.
**Approach** — Replace local keyframes and hardcoded durations/easings with shared variables/keyframes. Move toast exit timing to CSS by toggling an exit class in JS.
**Verification** — Run `npm test` from `frontend/`.
**Done when** — The duplicate keyframe declarations are removed and toast/modal/dashboard/hub/skeleton/spinner motion follows the shared variables.
**Notes** — Do not change visible labels, API calls, or component state flow.

## Task 4: Stabilize Touched Transitions

**Goal** — Reduce accidental animation of unrelated properties.
**Files** — Modify only CSS files already touched in Tasks 1-3.
**Approach** — Replace `transition-all` in touched selectors with explicit properties such as color, background-color, border-color, box-shadow, opacity, transform, or width.
**Verification** — Run `npm test` and `npm run build` from `frontend/`.
**Done when** — Touched motion-heavy selectors no longer rely on broad `transition-all`.
**Notes** — Leave unrelated CSS files for a later pass unless they are directly involved in the motion bugs.

## Task 5: Final Verification

**Goal** — Confirm behavior is preserved after the cleanup.
**Files** — No source changes expected.
**Approach** — Run the real frontend verification commands and inspect output.
**Verification** — `npm test` and `npm run build` from `frontend/`.
**Done when** — Commands pass or any remaining failures are reported with exact output.
**Notes** — Backend tests are already green in the baseline and only need rerunning if backend files are changed.
