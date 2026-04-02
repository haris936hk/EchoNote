---
description: Run ESLint and Prettier checks, auto-fix what can be fixed, and report remaining issues
---

1. Ask the user which mode they want:
   - **check** — report issues only, no changes
   - **fix** — auto-fix everything that can be fixed, then report what remains

2. Run Prettier in check mode first to identify formatting violations.
// turbo
3. Run `npx prettier --check .`

4. **If mode is "fix":** Run Prettier to auto-format all files.
// turbo
5. Run `npx prettier --write .`

6. Run ESLint across the project. Use the `--max-warnings 0` flag so warnings are treated as failures.
// turbo
7. Run `npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0`

8. **If mode is "fix":** Re-run ESLint with the `--fix` flag to auto-fix fixable rule violations.
// turbo
9. Run `npx eslint . --ext .js,.jsx,.ts,.tsx --fix`

10. After all commands complete, summarize the results:
    - List every file that was auto-formatted by Prettier (if fix mode).
    - List every ESLint error that was auto-fixed (if fix mode).
    - List every remaining ESLint error or warning that requires manual attention, grouped by file.
    - If there are zero remaining issues, confirm the project is clean.

11. Do not modify any file beyond what Prettier and ESLint auto-fix. Do not attempt to manually rewrite code to resolve ESLint errors.