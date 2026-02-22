# TCC Landing Page Diagnosis

## Tech Stack
- Framework: React 18 + Vite (`vite`, `@vitejs/plugin-react-swc`), TypeScript.
- Routing: `react-router-dom` v6 with `BrowserRouter` and nested `<Routes>/<Route>` in `src/App.tsx`.
- Styling: Tailwind CSS (`tailwindcss`, `tailwindcss-animate`) + global CSS in `src/index.css`.
- Icon approach:
  - Lucide React components (`lucide-react`) for UI icons like menu/close/spinner.
  - Google Material Icons font ligatures for landing brand/features (`<span className="material-icons">icon_name</span>`).
- Global layout file: Vite HTML shell in `index.html` (document head + font links), app bootstrap in `src/main.tsx`, top-level route composition in `src/App.tsx`.
- Relevant dependencies:
  - UI/components: `@radix-ui/react-*` (accordion, dialog, dropdown-menu, tabs, tooltip, etc.), `sonner`, `vaul`, `cmdk`, `react-resizable-panels`, `embla-carousel-react`, `recharts`.
  - Icons: `lucide-react`.
  - Styling: `tailwindcss`, `tailwind-merge`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `postcss`, `autoprefixer`.
  - Fonts/icons via CDN in `index.html`: Google Fonts + Material Icons.
  - Not present: `@mui/icons-material` / MUI icon package is not installed.

## Landing Page Structure
- Main file path: `src/pages/LandingPage.tsx`.
- Sub-components imported:
  - `AuthTabs` from `src/components/auth/AuthTabs.tsx`.
  - Hooks/utilities used in this page: `useAuth` from `src/hooks/useAuth`, `useNavigate` from `react-router-dom`.
  - Icon components used in-page: `Menu`, `X`, `Loader2` from `lucide-react`.
- Content source (hardcoded vs config file):
  - Hardcoded in the same file via local constants `FEATURES` and `HOW_IT_WORKS` (`src/pages/LandingPage.tsx:7-42`).
  - Not pulled from external CMS/JSON/config file.

## Icon Rendering Issue
- Where icon names are defined: (file path and line numbers)
  - `assignment`: `src/pages/LandingPage.tsx:9`
  - `forum`: `src/pages/LandingPage.tsx:15`
  - `family_restroom`: `src/pages/LandingPage.tsx:21`
  - `school` (navbar logo): `src/pages/LandingPage.tsx:84`

- How icons are currently rendered: (exact code block)
```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3E7E10]/20">
  <span className="material-icons text-[22px] text-[#3E7E10]">school</span>
</div>
```

```tsx
<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3E7E10]/20">
  <span className="material-icons text-[24px] text-[#3E7E10]">{feature.icon}</span>
</div>
```

- Is the Material Icons font imported: yes/no, and where
  - Yes.
  - `index.html:15`:
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap" rel="stylesheet">
```

- Is the `material-icons` class applied: yes/no
  - Yes, applied on both logo and feature-card icon spans (`src/pages/LandingPage.tsx:84`, `src/pages/LandingPage.tsx:179`).
  - There is also a global safeguard class definition in `src/index.css:193-204` forcing `font-family: "Material Icons" !important`.

- Root cause:
  - In the current repository state, the landing page code is correctly wired for Material Icons (font link exists, correct class exists, correct element structure exists).
  - If production still shows raw text glyph names, the most likely cause is deployment/runtime drift rather than current source:
    - stale cached app shell/service worker serving an older `index.html`/bundle,
    - or blocked/failed Google Fonts fetch in the client environment.
  - Confirmed non-cause: missing `@mui/icons-material` package is irrelevant here because this page does not use MUI icon components.

## HTML Entity Bug
- Where the string is defined: (file path and line number)
  - Parent Visibility description is at `src/pages/LandingPage.tsx:24`.

- Exact string in source:
```ts
"Parents link with a simple code and see their child's schedule and notes. Read only, zero friction."
```

- How it is rendered:
  - Rendered as normal JSX text through `{feature.description}` in the feature card map (`src/pages/LandingPage.tsx:182`).
  - Not rendered with `dangerouslySetInnerHTML` in this component.

- Root cause:
  - In current source, the landing page no longer contains `&apos;`; it already uses a literal apostrophe.
  - If live still displays `&apos;`, that points to stale deployed/cached assets, or a different branch/environment than this local repo state.

## Other Sections Using Icons
- List of sections below the fold that use icons and whether they are affected:
  - How It Works (`src/pages/LandingPage.tsx:188-227`): uses numeric circles (`{index + 1}`), not icon fonts.
  - Get Started Today/Auth section (`src/pages/LandingPage.tsx:229-236`): embeds `AuthTabs`; no Material Icons in landing component markup.
  - Footer (`src/pages/LandingPage.tsx:239-242`): no icons.
  - Additional landing icons outside feature cards:
    - Navbar uses Material Icon `school` (`src/pages/LandingPage.tsx:84`).
    - Mobile nav toggle and loading spinner use Lucide components (`Menu`, `X`, `Loader2`) and are not tied to Material Icons.

## Recommended Fix Scope
- `index.html`: verify production is serving the current file that includes the Material Icons stylesheet link (and not a stale cached HTML shell).
- `src/pages/LandingPage.tsx`: no code changes required in current state for icon markup/entity text; verify deployed artifact matches this file.
- `src/index.css`: keep `.material-icons` font-family guard to prevent global font overrides from turning ligatures into plain text.
- `vite.config.ts`: if live cache drift persists, force service worker/client cache busting strategy during next deploy (operational/deployment scope).

## Other Issues Noticed
- Repository/local state appears ahead of the reported live symptom:
  - Icon link present and apostrophe string already corrected.
- Similar HTML entity usage still exists elsewhere (not landing page), e.g. `src/pages/ParentDashboard.tsx` has `&apos;` in user-facing strings (`rg` found lines 497, 498, 565). JSX will render these literally if left as entities.
- Project uses PWA/service worker (`vite-plugin-pwa` in `vite.config.ts`), which can preserve stale assets on clients if update adoption is delayed.
- `@mui/icons-material` is not installed (`npm ls @mui/icons-material --depth=0` returned empty), confirming icon strategy is not MUI-based.
