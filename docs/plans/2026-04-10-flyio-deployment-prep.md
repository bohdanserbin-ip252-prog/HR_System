# HR System Fly.io Deployment Prep Plan

**Goal:** Prepare the repository for Fly.io deployment from GitHub with one app serving both the Rust backend and built React frontend, while persisting SQLite data on a Fly volume.
**Context:** The current repo already serves the built frontend from the backend, but the existing Dockerfile expects locally prebuilt artifacts that will not exist in a GitHub-based Fly build.
**Execution:** Implement directly in this session, verify with the repo commands plus a Docker image build, then commit and push only the Fly-related changes.

## Task 1: Confirm runtime assumptions for Fly volume-backed SQLite

**Goal** — Verify that a fresh database file on a mounted volume is safe for first boot.
**Files** — Inspect `backend/src/db.rs` and `backend/src/main.rs`
**Approach** — Confirm that startup initializes schema and seeds only when tables are empty so `/data/hr_system.db` can be created on first deploy.
**Verification** — Inspect the real startup and seed code paths.
**Done when** — The deployment plan can rely on `HR_SYSTEM_DB_PATH=/data/hr_system.db` without adding a custom entrypoint.
**Notes** — Do not modify database behavior unless the existing startup path is insufficient.

## Task 2: Replace local-artifact Docker packaging with source builds

**Goal** — Make Fly able to build the app straight from the GitHub repository.
**Files** — Modify `Dockerfile` and `.dockerignore`
**Approach** — Use multi-stage builds to compile the frontend and Rust backend inside Docker, remove reliance on tracked build outputs, and keep the runtime image focused on the compiled binary plus built frontend assets.
**Verification** — Run `docker build` from the project root after implementation.
**Done when** — The Docker build no longer depends on `frontend/dist` or `backend/target/release` being present in git.
**Notes** — Keep runtime env defaults aligned with Fly volume paths.

## Task 3: Add checked-in Fly configuration and deploy docs

**Goal** — Capture the Fly runtime setup in repo so deployment settings are reproducible.
**Files** — Add `fly.toml`; modify `README.md` and `.gitignore`
**Approach** — Add one-app Fly config with port 3000, mounted volume at `/data`, runtime env vars, and basic HTTP health checks; document the deployment flow and repo-specific caveats.
**Verification** — Inspect the resulting files and run the repo verification command to ensure the app still builds cleanly.
**Done when** — A teammate can deploy the repo on Fly with the committed config and documented steps.
**Notes** — The checked-in Fly app name may still need to be changed if the chosen global Fly app slug is unavailable.

## Task 4: Verify, commit, and push the Fly prep changes

**Goal** — Ship the Fly deployment prep safely without bundling unrelated local database edits.
**Files** — Inspect `git status` output and staged Fly-related files only.
**Approach** — Run the repo verification command, run a Docker build if possible, then commit only the intended files and push the branch.
**Verification** — Run `npm run verify`, run `docker build`, then inspect the final staged diff before commit.
**Done when** — The new commit is on `origin/main` and the pre-existing `backend/hr_system.db` modification remains untouched unless explicitly requested otherwise.
**Notes** — Keep user-local database contents out of the commit unless asked.
