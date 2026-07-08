# vvedantb/skills

Personal agent-skills catalog for Cursor, Claude Code, and Eva. One repo to edit; consumers install via the [Skills CLI](https://github.com/vercel-labs/skills).

## What this is

This repository is the single source of truth for every skill used across [eva](https://github.com/vvedantb/eva), [vmem](https://github.com/vvedantb/vmem), and future projects. Each skill lives in `skills/<name>/SKILL.md`. Project manifests in `manifests/` define which subset each repo installs.

## Prerequisites

- Node.js 20+
- `npx skills` (no global install required)

## Repo layout

```
skills/<name>/SKILL.md   # one folder per skill (kebab-case name matches frontmatter)
manifests/eva.json       # skill names for eva
manifests/vmem.json      # skill names for vmem
scripts/inventory.mjs    # inventory + copy from eva/vmem
scripts/bootstrap-project.mjs
ATTRIBUTION.md           # upstream sources for vendored skills
```

## Install into a project

```bash
cd your-project

# Install one skill from this catalog
npx skills add vvedantb/skills@zoom-out -y

# After cloning a project that already has skills-lock.json:
npx skills experimental_install

# Check for updates, then pull them
npx skills check
npx skills update
```

## Install globally (all projects on this machine)

```bash
npx skills add vvedantb/skills@zoom-out -g -y
npx skills update -g
```

Global and project installs are independent. Publishing changes here still requires `npx skills update` in each scope.

## Bootstrap a project from a manifest

```bash
# From eva or vmem (catalog repo can be a sibling checkout)
node ../skills/scripts/bootstrap-project.mjs --manifest eva --project .
node ../skills/scripts/bootstrap-project.mjs --manifest vmem --project ../vmem
```

The script loops manifest entries and runs `npx skills add vvedantb/skills@<name> -y` for each.

## Day-to-day workflow

| Task | Command |
|------|---------|
| Edit a skill | Change `skills/<name>/SKILL.md`, commit, push |
| Pull updates in a project | `npx skills check` then `npx skills update` |
| Add a new skill | `npx skills init <name>` locally, move into `skills/`, update manifests, commit |
| Remove skill from a project | `npx skills remove <name>` |
| Re-inventory eva + vmem | `node scripts/inventory.mjs --json` |

## Eva-specific note

Eva remote agents read `.agents/skills/` from the **GitHub base branch**, not your global `~/.claude/skills`. After installing skills, commit and push:

- `skills-lock.json`
- `.agents/skills/` (generated copies)

Eva's repo skills sync (`packages/backend/convex/_repoSkills/sync.ts`) picks up metadata from `.agents/skills` on the base branch.

## Which skills belong to which project

- **eva** — 49 skills: see [`manifests/eva.json`](manifests/eva.json)
- **vmem** — 62 skills: see [`manifests/vmem.json`](manifests/vmem.json)

## Attribution

Vendored skills retain original authorship. See [ATTRIBUTION.md](ATTRIBUTION.md) for upstream repos per skill.

## Maintenance scripts

```bash
# List skills, detect duplicates across eva/vmem
node scripts/inventory.mjs

# Re-copy catalog from eva/vmem (destructive to skills/)
node scripts/inventory.mjs --copy
```
