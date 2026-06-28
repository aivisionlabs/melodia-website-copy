Query the graphify knowledge graph for this codebase, with automatic fallback to grep+Read when graphify returns wrong or insufficient results.

## Decision: should graphify run at all?

Before running anything, check whether $ARGUMENTS contains ONLY generic terms that are known to cause graphify node collisions:

**Skip graphify entirely** (go straight to FALLBACK) if the question:
- Names a specific known file path (e.g. "what's in rate-limiting/config.ts", "read schema.ts")
- Uses *only* generic node names with no domain context: `config`, `utils`, `index`, `types`, `middleware` alone
- Is a simple symbol lookup where `grep` is sufficient (e.g. "where is X defined")

**Use graphify** for everything else:
- "How does X flow work?" / "What calls Y?" / "Which files are involved in Z?"
- Multi-file architecture questions, dependency mapping, cross-service traces
- Any question where the answer spans >3 files

---

## Step 1 — Run graphify

Choose budget based on question scope:
- Single service or module: `--budget 800`
- Cross-service or full flow: `--budget 1500`
- Targeted symbol lookup: `--budget 600`

```bash
graphify query "$ARGUMENTS" --budget 1200
```

---

## Step 2 — Evaluate the result

After running, check for these **failure signals**:

| Signal | Meaning |
|---|---|
| Fewer than 5 nodes returned | Query anchored on wrong/missing nodes |
| Output contains only `logger`, `proxy`, `button`, `utils` nodes | Generic term collision — wrong anchor |
| Output says "No node matching" or "No path found" | Node not indexed by that name |
| Nodes returned are unrelated to the domain in the question | BFS started from wrong community |

If ANY failure signal is present → go to **FALLBACK** immediately. Do not try to answer from wrong graphify output.

If result looks valid (domain-relevant nodes, community matches the question) → answer from graphify output. Quote `src=` source locations when citing specific facts. Do not read source files.

---

## FALLBACK — grep + targeted Read

When graphify fails, say: *"graphify returned no relevant results — falling back to grep+Read."*

Then run these steps:

```bash
# Step F1: find files containing the key term
grep -rl "<key term from $ARGUMENTS>" src/ --include="*.ts" --include="*.tsx" | head -15
```

```bash
# Step F2: if >8 files match, narrow by subdirectory
grep -rl "<key term>" src/lib/ --include="*.ts" | head -10
grep -rl "<key term>" src/app/api/ --include="*.ts" | head -10
```

Read only the **2–3 most relevant files** from the grep output. Do not read all matched files.

For known directory structures, use `find` directly:
```bash
find src/lib/<module-name> -name "*.ts"
```

Answer from the file contents and state which files you read.
