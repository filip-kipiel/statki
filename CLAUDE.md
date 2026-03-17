# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint
npm run preview   # preview production build
```

> npm is blocked via PowerShell execution policy — use `"C:\Program Files\nodejs\npm.cmd"` if plain `npm` doesn't work in terminal.

## Stack

- **Vite 8** + **React 19** + **TypeScript 5.9** (strict mode)
- **Tailwind CSS v4** — configured via `@tailwindcss/vite` plugin (no `tailwind.config.js`); import is `@import "tailwindcss"` in `src/index.css`
- **Supabase JS v2** — installed, not yet configured

## Architecture conventions

- Components go in `src/components/`
- Game state goes in `src/store/`
- Variable and file names in English, comments in Polish
- Do not install new UI libraries without asking
