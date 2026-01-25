# Technology Stack

**Analysis Date:** 2026-01-24

## Languages

**Primary:**
- TypeScript 5.8.3 - Full application codebase (frontend)
- JavaScript - Configuration files and build tooling

**Secondary:**
- CSS/PostCSS - Styling with Tailwind CSS compilation

## Runtime

**Environment:**
- Node.js (implied by package manager)

**Package Manager:**
- npm/pnpm (inferred from package-lock or lockfile)
- Lockfile: Present (required for reproducible builds)

## Frameworks

**Core:**
- React 18.3.1 - UI framework for building components and pages
- React Router 6.30.1 - Client-side routing for multi-page SPA navigation
- React Hook Form 7.61.1 - Form state management and validation
- React Query (@tanstack/react-query) 5.83.0 - Server state management and data fetching

**UI/Component:**
- Radix UI (complete component library) - Accessible unstyled components
  - @radix-ui/react-accordion 1.2.11
  - @radix-ui/react-alert-dialog 1.1.14
  - @radix-ui/react-avatar 1.1.10
  - @radix-ui/react-checkbox 1.3.2
  - @radix-ui/react-dialog 1.1.14
  - @radix-ui/react-dropdown-menu 2.1.15
  - @radix-ui/react-hover-card 1.1.14
  - @radix-ui/react-label 2.1.7
  - @radix-ui/react-navigation-menu 1.2.13
  - @radix-ui/react-popover 1.1.14
  - @radix-ui/react-progress 1.1.7
  - @radix-ui/react-radio-group 1.3.7
  - @radix-ui/react-scroll-area 1.2.9
  - @radix-ui/react-select 2.2.5
  - @radix-ui/react-slider 1.3.5
  - @radix-ui/react-switch 1.2.5
  - @radix-ui/react-tabs 1.1.12
  - @radix-ui/react-toast 1.2.14
  - @radix-ui/react-toggle 1.1.9
  - @radix-ui/react-toggle-group 1.1.10
  - @radix-ui/react-tooltip 1.2.7

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework for styling
- tailwind-merge 2.6.0 - Utility for merging Tailwind CSS classes
- tailwindcss-animate 1.0.7 - Animation utilities for Tailwind
- AutoPrefixer 10.4.21 - Vendor prefixing for CSS compatibility
- PostCSS 8.5.6 - CSS transformation framework

**Styling Tools:**
- Class Variance Authority (CVA) 0.7.1 - Type-safe CSS class composition
- clsx 2.1.1 - Utility for conditional class name composition

**Build/Dev:**
- Vite 5.4.19 - Fast build tool and dev server
- @vitejs/plugin-react-swc 3.11.0 - React plugin using SWC compiler
- vite-plugin-pwa 1.2.0 - Progressive Web App support with Workbox caching
- lovable-tagger 1.1.13 - Component tagging tool (development only)

**Testing:**
- Not detected

**Linting/Formatting:**
- ESLint 9.32.0 - JavaScript/TypeScript linter
- eslint-plugin-react-hooks 5.2.0 - React Hooks linting rules
- eslint-plugin-react-refresh 0.4.20 - React Refresh validation
- typescript-eslint 8.38.0 - TypeScript support for ESLint
- Prettier - Not explicitly configured (but implicit from project structure)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Supabase client SDK for database, auth, and functions
- @hookform/resolvers 3.10.0 - Form validation resolver library
- zod 3.25.76 - TypeScript-first schema validation

**Data Visualization:**
- recharts 2.15.4 - React charting library for progress/analytics views
- embla-carousel-react 8.6.0 - Carousel/slider component library

**Icons & UI Elements:**
- lucide-react 0.462.0 - Icon library
- react-day-picker 8.10.1 - Date picker component
- sonner 1.7.4 - Toast notification library
- cmdk 1.1.1 - Command palette/dropdown component
- qrcode.react 4.2.0 - QR code generation
- html5-qrcode 2.3.8 - QR code scanning

**Utilities:**
- date-fns 3.6.0 - Date manipulation library
- input-otp 1.4.2 - OTP input component
- react-resizable-panels 2.1.9 - Resizable panel layouts
- vaul 0.9.9 - Sheet/drawer component

**Theme Management:**
- next-themes 0.3.0 - Dark mode and theme switching

## Configuration

**Environment:**
- Environment variables prefixed with `VITE_` for Vite exposure
- Configuration in `.env` file (not committed to git)
- Required environment variables:
  - `VITE_SUPABASE_PROJECT_ID` - Supabase project identifier
  - `VITE_SUPABASE_URL` - Supabase API endpoint
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public anon key
  - `GEMINI_API_KEY` - Google Gemini API key for AI features

**TypeScript:**
- Base config: `tsconfig.json` - Shared strict settings with path aliases
- App config: `tsconfig.app.json` - React app specific settings (ES2020 target, jsx: react-jsx)
- Node config: `tsconfig.node.json` - Vite config specific (ES2022 target)
- Path alias: `@/*` maps to `./src/*` for import convenience

**Build:**
- Vite config: `vite.config.ts`
  - Dev server runs on `localhost:8080` with `host: true`
  - PWA enabled with manifest and Workbox caching
  - Alias resolution for `@` imports
- ESLint config: `eslint.config.js` (flat config format, ES version 2020+)
- Tailwind config: `tailwind.config.ts`
  - Dark mode via class selector
  - Extensive color system with custom tokens
  - Typography and spacing extensions
- PostCSS config: `postcss.config.js` (Tailwind + AutoPrefixer)

## Platform Requirements

**Development:**
- Node.js with npm/pnpm
- Modern web browser with ES2020+ support
- Git for version control

**Production:**
- Static hosting (Vite SPA) or Node.js server with static file serving
- Supabase account and project configured
- Google OAuth credentials configured in Supabase
- Gemini API credentials for AI features
- PWA manifest served from `/` origin

**PWA Support:**
- Service worker registration via Workbox
- Offline support for cached assets (fonts, JS, CSS, HTML)
- Google Fonts caching with 1-year expiration
- Installable on mobile and desktop platforms

---

*Stack analysis: 2026-01-24*
