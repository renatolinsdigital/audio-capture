# Code Quality

This document describes the tools, configuration, and automated enforcement in place for this project.

---

## Overview

| Layer | Tool | Scope |
|---|---|---|
| TypeScript / React linting | ESLint 9 (flat config) | `src/**/*.{ts,tsx}` |
| Code formatting | Prettier | `src/**/*.{ts,tsx,scss,css,json}` |
| Rust linting | Cargo Clippy | `src-tauri/src/**/*.rs` |
| Rust dead-code enforcement | `#![deny(unused)]` | Rust crate |
| Pre-commit automation | Husky + lint-staged | Staged files only |

---

## ESLint

**Config file:** [`eslint.config.js`](../eslint.config.js) (ESLint 9 flat config format)

### Plugins active

- **`@eslint/js`** — core JS recommended rules
- **`typescript-eslint`** — TypeScript-aware type-checked rules
- **`eslint-plugin-react-hooks`** — enforces Rules of Hooks and exhaustive deps
- **`eslint-plugin-react-refresh`** — warns if a module exports something other than a component (breaks HMR)
- **`eslint-config-prettier`** — disables ESLint formatting rules that would conflict with Prettier

### Key rules

| Rule | Level | Reason |
|---|---|---|
| `@typescript-eslint/no-unused-vars` | error | Catches dead variables; ignores `_`-prefixed params |
| `react-hooks/rules-of-hooks` | error | Prevents invalid Hook calls |
| `react-hooks/exhaustive-deps` | warn | Flags missing `useEffect` deps |
| `react-refresh/only-export-components` | warn | Keeps HMR reliable |
| `react-hooks/set-state-in-effect` | off | Disabled — flags standard async-fetch-in-effect patterns as errors (false positive for this codebase) |

### Scripts

```bash
npm run lint          # Check all files in src/ — zero warnings allowed
npm run lint:fix      # Auto-fix everything that can be fixed
```

---

## Prettier

**Config file:** [`.prettierrc`](../.prettierrc)  
**Ignore file:** [`.prettierignore`](../.prettierignore)

### Settings

| Option | Value |
|---|---|
| `semi` | `true` |
| `singleQuote` | `true` |
| `tabWidth` | `2` |
| `trailingComma` | `"es5"` |
| `printWidth` | `100` |
| `arrowParens` | `"avoid"` |

Prettier runs after ESLint in lint-staged so it always has the final say on formatting. `eslint-config-prettier` ensures there are no rule conflicts between the two.

### Scripts

```bash
npm run format        # Reformat all files in src/
npm run format:check  # Check formatting without writing (useful in CI)
```

---

## Cargo Clippy (Rust)

**Config file:** [`src-tauri/clippy.toml`](../src-tauri/clippy.toml)

Clippy is Rust's official linter. It is configured in two layers:

### Crate-level lint attributes — [`src/lib.rs`](../src-tauri/src/lib.rs)

```rust
#![deny(unused)]          // dead code, unused imports, unused variables → compile error
#![warn(clippy::all)]     // full Clippy lint set → warning (treated as error via -D warnings)
```

`#![deny(unused)]` is the primary guard that prevents the original issue — dead methods or imports — from ever compiling again.

### Running manually

```bash
npm run lint:rust         # cargo clippy -- -D warnings (all warnings become errors)
npm run lint:rust:fix     # cargo clippy --fix (auto-apply suggestions)
```

---

## Husky + lint-staged

**Hook directory:** [`.husky/`](../.husky/)  
**Hook file:** [`.husky/pre-commit`](../.husky/pre-commit)

### How it works

When you run `git commit`, Husky intercepts the commit and runs `lint-staged`. lint-staged collects only the **files you've staged** (not the whole repo) and runs the configured checks on them. If any check fails the commit is aborted.

```
git commit
    └── Husky pre-commit hook
            └── lint-staged
                    ├── *.{ts,tsx}  →  eslint --max-warnings 0
                    │               →  prettier --write
                    ├── *.{scss,css,json}  →  prettier --write
                    └── *.rs        →  cargo clippy -- -D warnings
```

### lint-staged configuration (in `package.json`)

```jsonc
"lint-staged": {
  "src/**/*.{ts,tsx}": [
    "eslint --max-warnings 0",   // must pass before formatting
    "prettier --write"           // auto-format and stage the result
  ],
  "src/**/*.{scss,css,json}": [
    "prettier --write"
  ],
  "src-tauri/src/**/*.rs": [
    "bash -c 'cd src-tauri && cargo clippy -- -D warnings'"
  ]
}
```

Prettier changes are re-staged automatically, so commits always contain formatted code.

### Setup

Husky installs itself via the `prepare` npm lifecycle script, so it activates automatically after `npm install`:

```bash
npm install   # installs deps and runs `husky` via prepare
```

If the hooks are not running, ensure the git repo is initialised (`git init`) before installing.

---

## Quick Reference

```bash
# TypeScript / React
npm run lint              # ESLint check
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier format
npm run format:check      # Prettier check (no writes)
npm run type-check        # tsc --noEmit

# Rust
npm run lint:rust         # Clippy check
npm run lint:rust:fix     # Clippy auto-fix
```
