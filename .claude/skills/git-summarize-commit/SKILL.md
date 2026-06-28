---
name: git-summarize-commit
description: Creates commit messages by analyzing git status and diffs, then performs git commit. Use when the user asks to commit, summarize changes for a commit, write a commit message from the diff, or stage and commit.
---

# Git commit: summarize changes and commit

## Goal

Produce an accurate commit message from the actual diff, then commit. The message should reflect **what changed and why**, not a generic label.

## Workflow

1. **Inspect the working tree**
   - Run `git status` (short: `git status -sb`).
   - Run `git diff` for unstaged changes.
   - Run `git diff --cached` (or `git diff --staged`) for staged changes.
   - If both matter, read both; prefer **staged** diff when the user intends to commit what is already staged.

2. **Decide scope**
   - If nothing is staged and the user wants a single commit of current work: `git add` the paths that belong together (or ask if multiple logical commits are better).
   - If the user asked only for a message: stop after drafting the message unless they also asked to commit.

3. **Write the message**
   - **Subject**: imperative mood, ~50–72 characters, no trailing period (common convention).
   - **Body** (optional but use when helpful): what changed, why, breaking notes, or API/DB implications in plain language.
   - If the repo uses a prefix style (e.g. `feat:`, `fix:`), match existing recent commits: `git log -5 --oneline`.

4. **Commit**
   - Use `git commit -m "subject"` or a heredoc for subject + body.
   - Do not run `git push` unless the user asked.
   - Do not `git commit --amend` or rewrite history unless the user explicitly asked.

## Safety

- Never commit secrets (e.g. `.env`, API keys). If such files appear in the diff, stop and warn the user.
- If the change set mixes unrelated concerns, suggest splitting commits or ask which scope to include.

## Quick checklist

- [ ] Read status + relevant diff(s)
- [ ] Message matches the diff (files, behavior, not vague “updates”)
- [ ] Staging matches intent; user rules on signing off / push respected
- [ ] No sensitive data in the commit
