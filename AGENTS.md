# Repository Guidelines

## Project Structure & Module Organization
- `main/`: Electron main process (app lifecycle, managers, services, utils, types). Built output goes to `.vite/build/main.js`.
- `renderer/`: React + TypeScript UI (`src/` components, pages, hooks, stores, types; static assets in `public/` and `src/assets/`).
- `scripts/`: Node scripts for dev, build, packaging, and release automation.
- `build/` packaging assets; `dist/` packaged artifacts; `.vite/` Vite build output.
- Config lives in `vite.*.config.ts`, `electron-builder.config.js`, `tsconfig.json`, `.eslintrc.json`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite (renderer), build main/preload, then launch Electron.
- `npm run build`: Vite builds renderer, main, preload into `.vite/build` (no packaging).
- `npm run package[:win|mac|linux]`: build then package with electron-builder (no publish). Example: `npm run package:win`.
- `npm run dist[:win|mac|linux]`: alternate build+package path via electron-builder.
- `npm run lint`: run ESLint on `.ts/.tsx` files.
- Checks: `npm run test:builder`, `npm run test:update` (update/build integration).

## Coding Style & Naming Conventions
- Language: TypeScript with ESLint (`@typescript-eslint`, `import`, `react-hooks`). Indent 2 spaces; use semicolons; prefer double quotes in TS.
- React components: PascalCase files (e.g., `ScreenshotViewer.tsx`). Functions/variables camelCase; hooks `useXxx`; types/interfaces PascalCase in `types.ts`.
- Keep modules focused; colocate related files under feature folders.

## Language & Localization
- 输出语言：默认使用简体中文（UI 文案、日志、错误信息与文档）。涉及英文术语时保留英文并在首次出现处附中文说明；代码标识符与 API 名称不翻译。

## Testing Guidelines
- No formal unit test framework yet; rely on the scripts above for integration checks.
- When adding tests, place beside sources as `*.test.ts(x)` and prefer Vitest + React Testing Library. Target meaningful coverage over raw %.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `type(scope): summary`. Examples: `feat(update): add download progress`, `fix(tray): focus existing window`.
- PRs include: clear summary, linked issues (`Closes #123`), target OS, screenshots/GIFs for UI changes, and notes on config/packaging impacts.

## Security & Configuration Tips
- Never commit secrets. Use local `.env` (gitignored) for tokens/keys; configure API keys via the app where possible.
- Packaging/signing certificates must remain private; avoid `--publish` locally unless you know the CI flow.
