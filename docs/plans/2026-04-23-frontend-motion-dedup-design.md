# Frontend Motion And Dedup Design

**Goal:** Make frontend styling and motion use one shared source of truth while preserving current product behavior.
**Approved:** User approved this conservative approach on 2026-04-23.

## Observed Facts

- `frontend/src/style.css` is the global stylesheet entrypoint, but it does not import `19-recruitment-*` or `20-surveys-ux.css`.
- `RecruitmentPage.jsx` imports `../styles/19-recruitment-ux.css` directly.
- `SurveysPage.jsx` imports `../styles/20-surveys-ux.css` directly.
- Motion is spread across feature CSS files via local keyframes and ad hoc durations:
  - `fadeIn` in `05-dashboard-cards.css`
  - `employees-spin` in `06-table-organization.css`
  - `skeleton-pulse` in `06c-skeleton.css`
  - `slideIn` in `07-modals-onboarding.css`
  - `hub-panel-fade` in `16b-hub-tabs.css`
- `toast.ts` sets exit transition timing directly in JavaScript.
- Frontend tests currently pass with `npm test` from `frontend/`.
- Backend tests currently pass with `cargo test --locked` from `backend/`.

## Design

Create a small shared motion foundation in CSS, then have feature styles consume it.

- Add shared motion tokens to `frontend/src/styles/01-base.css`:
  - duration variables for fast/base/slow motion
  - easing variables for standard/entrance/exit motion
  - canonical keyframes for fade/slide, spin, and pulse
  - reduced-motion defaults that disable non-essential animation and smooth scrolling
- Centralize stylesheet loading through `frontend/src/style.css`:
  - import recruitment and survey CSS there
  - remove component-level CSS side-effect imports for those pages
- Replace duplicated local keyframes with shared keyframes:
  - dashboard and hub panels use the same entrance keyframe
  - toast uses the same entrance/exit contract
  - spinner/skeleton use shared keyframes
- Replace unstable `transition-all` in touched CSS with explicit transition properties where practical.
- Keep backend code unchanged unless a concrete duplication with clear behavior-preserving extraction appears during implementation.

## Risks

- CSS ordering can affect recruitment and survey pages once moved into the global entrypoint. Import order should keep these late in `style.css`.
- Replacing `transition-all` globally can create large visual churn. Limit the first pass to known motion-heavy files and touched selectors.
- `prefers-reduced-motion` must not hide loading state entirely. Spinners and skeletons should become static or minimally animated rather than disappearing.

## Verification

- `npm test` from `frontend/`
- `npm run build` from `frontend/`
- `cargo test --locked` from `backend/` if backend files are touched, otherwise no backend rerun is required.
