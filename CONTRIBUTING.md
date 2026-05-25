# Contributing to Dot

Thanks for your interest in contributing. Dot is a personal project, but pull requests, bug reports, and ideas are welcome.

## Quick Start

1. Fork and clone the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run type-check before submitting: `pnpm -F chrome-extension type-check`
5. Open a pull request

## Reporting Bugs

- Search existing issues first
- Include: clear description, steps to reproduce, OS + Chrome version, screenshots if applicable

## Code Style

- Prettier (2 spaces, single quotes, trailing commas) — enforced on commit via lint-staged
- ESLint + TypeScript strict mode
- No new dependencies without discussion
- No changes to `turbo.json`, `pnpm-workspace.yaml`, or `tsconfig*` without prior agreement

## Commit Format

```
feat(scope): description
fix(scope): description
refactor(scope): description
```

Scopes: `ui`, `agent`, `storage`, `workflow`, `config`, `build`

## License

By contributing, you agree your contributions are licensed under Apache 2.0.
