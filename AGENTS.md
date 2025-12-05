# Repository Guidelines

## Project Structure & Module Organization
`src/` contains all React + TypeScript code: `components/` for reusable UI, `pages/` for routed screens (currently `Notebook`), `commands/` for SQL helpers, `contexts/` for shared state, `hooks/` and `utils/` for client logic, and `assets/` for static icons loaded at runtime. Platform assets live in `public/` while marketing visuals stay in the root `assets/` folder. The desktop backend sits under `src-tauri/` (Rust, Tauri config, and integration tests). Automation helpers such as `scripts/update-version.js` and custom Vite plugins (`vite-plugins/`) reside at the top level beside the various `tsconfig*.json`, `tailwind.config.js`, and `eslint.config.js` files that define the build.

## Build, Test & Development Commands
- `npm install` — sync Node/Vite dependencies before any work (Rust deps managed by Cargo inside `src-tauri/`).
- `npm run dev` — launch the Vite dev server for the web UI; pair with `npm run tauri dev` when you need the full desktop shell.
- `npm run build` — run TypeScript project references (`tsc -b`) and emit the production bundle into `dist/`.
- `npm run preview` — serve the build for QA at the same port the desktop shell expects.
- `npm run lint` — execute ESLint using `eslint.config.js`; CI treats warnings as actionable feedback.
- `npm run tauri build` — package the desktop app with Rust + Tauri artifacts (requires the `tauri` CLI tooling set up locally).
- `npm run version:check` / `npm run version:update` — verify and bump `.env`, `version.json`, and `VERSION_MANAGEMENT.md`.

## Coding Style & Naming Conventions
Use modern React function components with hooks, 2-space indentation, and TypeScript’s strict typing. Components and contexts follow PascalCase (`Notebook`, `ThemeProvider`), hooks use `useVerbNoun`, and utility files use camelCase. Tailwind classes are defined in `index.css`/`App.css`; keep class lists grouped by layout → color → state. Prefer absolute imports rooted at `src` (configured via Vite) and run `npm run lint` plus editor-formatting (Prettier or the IDE’s ESLint integration) before committing.

## Testing Guidelines
Front-end tests are sparse today; add `*.test.tsx` beside the component you touch and mimic real usage with mocked SQL inputs. For the backend, extend `src-tauri/tests/collect_test.rs` and run `cd src-tauri && cargo test collect_test` to validate query registration logic. Regardless of automation, smoke-test `npm run dev` and `npm run tauri dev` to confirm Notebook flows, file imports, and DataFusion queries before pushing.

## Commit & Pull Request Guidelines
Follow the existing Conventional-Commits style (`fix: nested query`, `perf: read_excel default first sheet`, `other:` housekeeping). Commits should be focused and reference issues when applicable. PRs need: a crisp summary of the change, screenshots or screen recordings for UI updates, mention of affected commands/config files, and confirmation that `npm run lint`, `npm run build`, and relevant `cargo test` targets succeeded. Link any related `CHANGELOG` entry if you touched user-facing behavior.

## Security & Configuration Tips
Keep secrets out of the repo; only version `VITE_APP_*` placeholders in `.env`. Update `tauri.conf.json` when adding capabilities and verify the allowlist before bundling. On macOS, run `xattr -r -d com.apple.quarantine` after producing new `.app` artifacts to ensure QA can open the build without Gatekeeper friction.

## AI Query Assistant
`src/contexts/AiAssistantContext.ts` + `AiAssistantProvider.tsx` expose the Suggestion/Expert mode toggle plus model configuration (provider, baseUrl, key, model, temperature, token cap, retry limit). The UI for tuning lives in `src/components/ai/ai-settings-modal.tsx`, triggered from the Notebook header. Suggestion mode (implemented inside `notebook-middle`) calls `generateSqlWithModel` / `repairSqlWithModel` from `src/services/ai-assistant.ts`, which invoke the Tauri commands defined in `src-tauri/src/commands/ai.rs`. The Rust side builds structured prompts that describe the EasyDB SQL dialect and supported `read_xxx` functions, calls the configured OpenAI-compatible `chat/completions` endpoint, and expects a JSON payload `{ "sql": "...", "reasoning": "..." }`. Returned SQL is formatted, executed, and—on failure—rerouted back through the model up to `retryLimit` times before surfacing the error in the UI.
