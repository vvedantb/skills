# vvedantb/skills

Personal **custom** agent-skills catalog for Cursor, Claude Code, and Eva. Third-party skills install directly from upstream repos; only skills you author live here.

## What this is

- **`vvedantb/skills`** — skills you wrote (zoom-out, code-structure, eva-product-video, etc.)
- **Upstream repos** — clerk, mattpocock, taste-skill, vercel-labs, etc. via `npx skills add <owner/repo>@<skill>`
- **Project manifests** — `manifests/eva.json` and `manifests/vmem.json` list custom + upstream sources per project

## Prerequisites

- Node.js 20+
- `npx skills` (no global install required)

## Repo layout

```
skills/<name>/SKILL.md     # your custom skills only
manifests/eva.json         # { custom: [...], upstream: [{ source, skills }] }
manifests/vmem.json
scripts/build-manifests.mjs
scripts/bootstrap-project.mjs
scripts/strip-catalog.mjs
```

## Install into a project

```bash
cd your-project

# One custom skill from this repo
npx skills add vvedantb/skills@zoom-out -y

# One upstream skill (updates flow from upstream directly)
npx skills add mattpocock/skills@tdd -y

# Restore from skills-lock.json after clone
npx skills experimental_install

# Pull updates
npx skills check
npx skills update
```

## Bootstrap a project from manifest

```bash
# Fresh install: wipes skills-lock.json + .agents/skills, reinstalls all
node ../skills/scripts/bootstrap-project.mjs --manifest eva --project ../eva --fresh
node ../skills/scripts/bootstrap-project.mjs --manifest vmem --project ../vmem --fresh
```

Installs custom skills from `vvedantb/skills` and upstream skills from their original repos.

## Day-to-day workflow

| Task | Command |
|------|---------|
| Edit your skill | Change `skills/<name>/SKILL.md`, commit, push |
| Update custom skill in a project | `npx skills update` (for vvedantb/skills entries) |
| Update upstream skill | `npx skills update` (pulls from original repo) |
| Add new custom skill | `npx skills init <name>`, move into `skills/`, add to `scripts/custom-skills.mjs` + manifests |
| Regenerate manifests | `node scripts/build-manifests.mjs` |

## Eva-specific note

Eva remote agents read `.agents/skills/` from the **GitHub base branch**. After installing, commit and push:

- `skills-lock.json`
- `.agents/skills/`

## Which skills belong to which project

- **eva** — see [`manifests/eva.json`](manifests/eva.json) (8 custom + 41 upstream)
- **vmem** — see [`manifests/vmem.json`](manifests/vmem.json) (6 custom + 56 upstream)

Custom skill list is defined in [`scripts/custom-skills.mjs`](scripts/custom-skills.mjs).

## Attribution

See [ATTRIBUTION.md](ATTRIBUTION.md) for custom skills. Upstream skills retain original authorship in their source repos.
