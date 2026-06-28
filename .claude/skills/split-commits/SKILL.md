---
name: split-commits
description: Reviews all uncommitted code changes, groups them into logical units, and creates smaller, focused commits. Use when the user has many changes and wants to split them into clean, atomic commits.
---

# Split changes into smaller commits

## Goal

Review all uncommitted changes (staged + unstaged + untracked), group them into logical units, and create a series of small, focused commits — each with a clear, accurate commit message.

## Workflow

1. **Survey all changes**
   - Run `git status` to see the full picture (staged, unstaged, untracked).
   - Run `git diff` for unstaged changes.
   - Run `git diff --cached` for staged changes.
   - Read the content of any new untracked files.
   - Run `git log -5 --oneline` to match the repo's commit message style.

2. **Analyze and group changes**
   - Read every changed file to understand what each change does.
   - Group changes into logical units. A logical unit is a set of changes that:
     - Serve a single purpose (e.g., one feature, one bug fix, one refactor, one migration)
     - Can stand on their own without breaking the build
     - Are coherent when read together in a diff
   - Common groupings:
     - Schema/migration changes together
     - API route + its supporting service changes
     - UI component changes for a single feature
     - Config/dependency updates
     - Test additions or updates

3. **Present the plan to the user**
   - List each proposed commit with:
     - A draft commit message (subject line)
     - The files included
     - A one-line summary of what the group does

4. **Create commits in dependency order**
   - Start with foundational changes (schema, types, config) before dependent ones (API routes, UI).
   - For each commit:
     - First unstage everything: `git reset HEAD` (only if needed)
     - Stage only the files for this commit: `git add <specific files>`
     - If a file has changes belonging to multiple commits, use `git add -p <file>` is NOT supported — instead, note this to the user and include the full file in whichever commit is most relevant.
     - Commit with a clear message using a heredoc for multi-line messages.
   - After each commit, run `git status` to verify the remaining state is clean.

5. **Final verification**
   - After all commits, run `git log --oneline -<N>` (where N = number of commits created) to show the user the result.
   - Run `git status` to confirm nothing was missed.

## Commit message style

- **Subject**: imperative mood, ~50-72 characters, no trailing period.
- Match the repo's existing prefix convention if any (e.g., `feat:`, `fix:`).
- Add a body when the change is non-obvious.
- End every commit message with:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```

## Safety

- Never commit secrets (`.env`, API keys, credentials). Warn the user if detected.
- Do not run `git push` unless the user explicitly asks.
- Do not amend or rewrite existing commits.
- If a file contains mixed concerns that can't be split at the file level, ask the user which commit to include it in.
- Prefer more commits over fewer — err on the side of granularity.

## Quick checklist

- [ ] Read status + all diffs + untracked files
- [ ] Every changed file has been read and understood
- [ ] Changes grouped into logical, independent units
- [ ] Plan presented to user and confirmed
- [ ] Commits created in dependency order
- [ ] Each commit message accurately reflects its diff
- [ ] No sensitive data committed
- [ ] Final `git log` + `git status` shown to user
