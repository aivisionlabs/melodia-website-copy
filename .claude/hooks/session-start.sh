#!/usr/bin/env bash
# ============================================================
#  session-start.sh — Pre-session context loader
#  Runs before Claude Code loads CLAUDE.md
#  Place in: .claude/hooks/session-start.sh
# ============================================================

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"

# ── Detect task type from git branch name ────────────────────
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TASK_TYPE="general"

[[ "$BRANCH" =~ ^feat/ ]]    && TASK_TYPE="feature"
[[ "$BRANCH" =~ ^fix/ ]]     && TASK_TYPE="bugfix"
[[ "$BRANCH" =~ ^test/ ]]    && TASK_TYPE="testing"
[[ "$BRANCH" =~ ^docs/ ]]    && TASK_TYPE="docs"
[[ "$BRANCH" =~ ^refactor/ ]] && TASK_TYPE="refactor"

# ── Inject minimal context based on task type ────────────────
echo "## Session Context (Auto-injected by token-optimizer)"
echo "Branch: $BRANCH | Task type: $TASK_TYPE"
echo "Date: $(date '+%Y-%m-%d %H:%M')"

# Load task-relevant context only
case "$TASK_TYPE" in
  feature)
    echo "Relevant docs: docs/api-routes.md, docs/schema.md"
    ;;
  bugfix)
    echo "Relevant docs: docs/error-handling.md"
    ;;
  testing)
    echo "Relevant docs: docs/testing-guide.md"
    ;;
  docs)
    echo "Relevant docs: README.md"
    ;;
esac

# ── Warn if CLAUDE.md is too large ───────────────────────────
if [ -f "$CLAUDE_MD" ]; then
  TOKEN_ESTIMATE=$(wc -w < "$CLAUDE_MD")
  # rough: 1 token ≈ 0.75 words
  TOKEN_ESTIMATE=$((TOKEN_ESTIMATE * 4 / 3))
  if [ "$TOKEN_ESTIMATE" -gt 1500 ]; then
    echo ""
    echo "⚠️  WARNING: CLAUDE.md is ~$TOKEN_ESTIMATE tokens (target: <600)"
    echo "   Run: tokencheck to find what to trim"
  fi
fi

echo ""
