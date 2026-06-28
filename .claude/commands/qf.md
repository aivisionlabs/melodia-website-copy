Grep-first file finder with optional graphify enrichment. Use this when:
- The question uses generic terms (config, utils, index, middleware, types)
- You already know graphify will return wrong nodes for this query
- You want grep precision + graphify topology context together

Arguments: $ARGUMENTS

---

## Step 1 — Grep for exact term

```bash
grep -rl "$ARGUMENTS" src/ --include="*.ts" --include="*.tsx" | head -15
```

If 0 results: try a shorter substring of $ARGUMENTS.

---

## Step 2 — Decide whether to enrich with graphify

- **0–3 files matched:** Read them directly. Graphify not needed.
- **4–10 files matched:** Read the 2–3 most likely files. Optionally run graphify to understand how they connect.
- **10+ files matched:** The term is too generic for grep. Run graphify with a more specific phrasing:

```bash
graphify query "$ARGUMENTS" --budget 1200
```

If graphify also returns generic/wrong nodes (logger, proxy, button unrelated to query), read the top 3 files from the grep list.

---

## Step 3 — Read targeted files

Read only files that directly match — not every file in the grep output.
Prioritise: `src/lib/` services and `src/app/api/` routes over UI components unless the question is UI-specific.

State which files you read and what you found.
