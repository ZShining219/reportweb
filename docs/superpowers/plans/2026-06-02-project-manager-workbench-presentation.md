# Project Manager Workbench Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render project management as a workspace state using the existing stage, side drawers, and narrative island instead of a separate project manager page area.

**Architecture:** Extend `projectManager.js` into the project-state presentation module for board, list, and details renderers. Make `narrativeIsland.js` mode-aware so project management renders a status switcher instead of an empty report navigator. Keep `app.js` as orchestration only: state, URL, and callbacks.

**Tech Stack:** Node HTTP server, browser ES modules, plain DOM rendering, CSS tokens in `public/styles.css` / `public/ui`, Node built-in test runner.

---

## File Map

- Modify `public/modules/projectManager.js`: add selected project model fields and renderers for board/list/details.
- Modify `tests/project-manager.test.js`: add failing tests for selected state, board enter-report callbacks, list selection, and details.
- Modify `public/modules/narrativeIsland.js`: add project-manager view model branch and renderer branch.
- Modify `tests/narrative-island.test.js`: add failing tests for project-manager island content and callback.
- Modify `public/app.js`: keep `stage-shell`, render project board into `#stage`, render left/right project content, manage `selectedProjectId`.
- Modify `tests/narrative-island-app.test.js`: assert project manager no longer hides `stage-shell` or uses empty story tree.
- Modify `public/index.html`: remove unused `#projectManager` container.
- Modify `public/styles.css`: add project board/list/details and project island rules; remove unused project-manager shell rules.
- Modify `tests/narrative-island-style.test.js`: update CSS expectations.
- Modify `README.md`: update project management behavior notes if implementation changes user-facing behavior.

## Tasks

### Task 1: Project Manager Module

- [ ] Write failing tests for selected/active project model, board enter-report behavior, left list selection, and right details.
- [ ] Run `npm test -- tests/project-manager.test.js` and verify the new tests fail because exports or behavior are missing.
- [ ] Implement `createProjectManagerViewModel`, `renderProjectBoard`, `renderProjectList`, and `renderProjectDetails`.
- [ ] Run `npm test -- tests/project-manager.test.js` and verify it passes.
- [ ] Commit module changes.

### Task 2: Narrative Island Project Mode

- [ ] Write failing tests for `kind: 'project-manager'`, project management labels, no report-node text, and enter-report callback.
- [ ] Run `npm test -- tests/narrative-island.test.js` and verify failure.
- [ ] Implement the project-manager view model branch and renderer branch.
- [ ] Run `npm test -- tests/narrative-island.test.js`.
- [ ] Commit narrative island changes.

### Task 3: App Workspace Wiring

- [ ] Write failing text-structure tests proving project manager does not hide `stage-shell`, does not render an empty story tree into the island, and tracks `selectedProjectId`.
- [ ] Run `npm test -- tests/narrative-island-app.test.js`.
- [ ] Update `app.js` to render project board into `#stage`, project list into `#tree`, project details into `#inspector`, and use explicit enter-report callbacks.
- [ ] Remove `#projectManager` from `index.html`.
- [ ] Run focused app/module tests.
- [ ] Commit app wiring changes.

### Task 4: Styles And Docs

- [ ] Write/update CSS tests for `stage--project-board`, project board/list/details, and project island rules.
- [ ] Run style tests and verify failure.
- [ ] Update CSS using existing tokens and remove unused project-manager shell rules.
- [ ] Update README project management notes.
- [ ] Run full `npm test`.
- [ ] Commit style/docs changes.

### Task 5: Browser Verification

- [ ] Start `npm start` on the local service.
- [ ] Open `http://localhost:5173/?view=projects`.
- [ ] Verify project board renders in the stage, side drawers show project content, card click enters the report, left list selection updates details, and island switches modes.
- [ ] Stop the dev server if it was started for verification.
