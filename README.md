# vvedantb/skills

Your **custom** agent-skills only. Third-party skills install directly from upstream repos.

## Custom skills (this repo)

| Skill | Purpose |
|-------|---------|
| `ship` | Stage, commit, and push |
| `commit` | Stage and commit (no push) |
| `push` | Commit staged changes and push |
| `eva-product-video` | Eva Remotion product demos |
| `vedant-voice` | Spoken presentation / speaker-notes voice |

## Install

```bash
# Custom skill from this repo
npx skills add vvedantb/skills@ship -y

# Upstream skill (updates come from upstream, not this repo)
npx skills add mattpocock/skills@tdd -y

# Bootstrap a full project manifest
node ../skills/scripts/bootstrap-project.mjs --manifest eva --project . --fresh
```

## Manifests

- [`manifests/eva.json`](manifests/eva.json) — 4 custom + upstream
- [`manifests/vmem.json`](manifests/vmem.json) — 4 custom + upstream

Custom skill list: [`scripts/custom-skills.mjs`](scripts/custom-skills.mjs)

## Eva note

Commit `skills-lock.json` and `.agents/skills/` so Eva sandbox sync picks up skills from the base branch.
