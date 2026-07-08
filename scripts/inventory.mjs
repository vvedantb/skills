#!/usr/bin/env node
/**
 * Inventory skills across eva and vmem repos.
 * Usage: node scripts/inventory.mjs [--json] [--copy]
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EVA_ROOT = resolve(REPO_ROOT, "..", "eva");
const VMEM_ROOT = resolve(REPO_ROOT, "..", "vmem");

const SOURCES = [
  { label: "eva/.agents/skills", root: join(EVA_ROOT, ".agents", "skills"), priority: 1 },
  { label: "eva/.claude/skills", root: join(EVA_ROOT, ".claude", "skills"), priority: 2 },
  { label: "vmem/.agents/skills", root: join(VMEM_ROOT, ".agents", "skills"), priority: 3 },
  { label: "vmem/.claude/skills", root: join(VMEM_ROOT, ".claude", "skills"), priority: 4 },
];

const RENAME_MAP = {
  "make-interfaces-feel-better copy": "make-interfaces-feel-better",
};

function hashDirectory(dir) {
  const hash = createHash("sha256");
  const files = [];

  function walk(current) {
    if (basename(current) === "node_modules") return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }
    }
  }

  walk(dir);
  files.sort();
  for (const file of files) {
    hash.update(relative(dir, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

function loadLockfiles() {
  const upstream = new Map();
  for (const [project, root] of [
    ["eva", EVA_ROOT],
    ["vmem", VMEM_ROOT],
  ]) {
    const lockPath = join(root, "skills-lock.json");
    if (!existsSync(lockPath)) continue;
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    for (const [name, entry] of Object.entries(lock.skills ?? {})) {
      if (!upstream.has(name)) {
        upstream.set(name, {
          source: entry.source,
          skillPath: entry.skillPath ?? `skills/${name}/SKILL.md`,
          from: project,
        });
      }
    }
  }
  return upstream;
}

function collectSkills() {
  const byName = new Map();

  for (const source of SOURCES) {
    if (!existsSync(source.root)) continue;
    for (const entry of readdirSync(source.root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules") continue;

      const skillDir = join(source.root, entry.name);
      const skillFile = join(skillDir, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      const canonicalName = RENAME_MAP[entry.name] ?? entry.name;
      const record = {
        folderName: entry.name,
        canonicalName,
        source: source.label,
        path: skillDir,
        priority: source.priority,
        hash: hashDirectory(skillDir),
      };

      if (!byName.has(canonicalName)) {
        byName.set(canonicalName, []);
      }
      byName.get(canonicalName).push(record);
    }
  }

  return byName;
}

function pickCanonical(records) {
  return [...records].sort((a, b) => a.priority - b.priority)[0];
}

function copySkill(srcDir, destDir) {
  mkdirSync(dirname(destDir), { recursive: true });
  cpSync(srcDir, destDir, { recursive: true, force: true });
}

function buildManifests(allNames, evaAgents, evaClaude, vmemAgents, vmemClaude) {
  const evaSet = new Set([
    ...evaAgents,
    ...[...evaClaude].filter((n) => !evaAgents.has(n)),
  ]);
  evaSet.add("eva-product-video");

  const vmemSet = new Set([
    ...[...vmemAgents].map((n) => RENAME_MAP[n] ?? n),
    ...[...vmemClaude].map((n) => RENAME_MAP[n] ?? n),
  ]);

  const evaManifest = [...evaSet].filter((n) => allNames.has(n)).sort();
  const vmemManifest = [...vmemSet].filter((n) => allNames.has(n)).sort();

  return { eva: evaManifest, vmem: vmemManifest };
}

function buildAttribution(allNames, upstream, picks) {
  const lines = [
    "# Attribution",
    "",
    "This catalog vendors instruction packs from upstream authors. Each skill retains original authorship.",
    "",
    "| Skill | Upstream | Notes |",
    "|-------|----------|-------|",
  ];

  for (const name of [...allNames].sort()) {
    const meta = upstream.get(name);
    const pick = picks.get(name);
    if (meta) {
      const pathNote = meta.skillPath !== `skills/${name}/SKILL.md` ? meta.skillPath : "";
      lines.push(`| ${name} | [${meta.source}](https://github.com/${meta.source}) | ${pathNote} |`);
    } else if (pick) {
      lines.push(`| ${name} | local/custom | Copied from ${pick.source} |`);
    } else {
      lines.push(`| ${name} | unknown | |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function listDirNames(root) {
  if (!existsSync(root)) return new Set();
  return new Set(
    readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "node_modules")
      .filter((e) => existsSync(join(root, e.name, "SKILL.md")))
      .map((e) => e.name),
  );
}

const args = new Set(process.argv.slice(2));
const byName = collectSkills();
const upstream = loadLockfiles();
const conflicts = [];
const picks = new Map();

for (const [name, records] of byName) {
  const uniqueHashes = new Set(records.map((r) => r.hash));
  if (uniqueHashes.size > 1) {
    conflicts.push({
      name,
      variants: records.map((r) => ({ source: r.source, hash: r.hash.slice(0, 12) })),
    });
  }
  picks.set(name, pickCanonical(records));
}

const evaAgents = listDirNames(join(EVA_ROOT, ".agents", "skills"));
const evaClaude = listDirNames(join(EVA_ROOT, ".claude", "skills"));
const vmemAgents = listDirNames(join(VMEM_ROOT, ".agents", "skills"));
const vmemClaude = listDirNames(join(VMEM_ROOT, ".claude", "skills"));

const allNames = new Set(picks.keys());
const manifests = buildManifests(allNames, evaAgents, evaClaude, vmemAgents, vmemClaude);

const report = {
  totalUnique: allNames.size,
  evaManifestCount: manifests.eva.length,
  vmemManifestCount: manifests.vmem.length,
  conflicts,
  skills: [...picks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, pick]) => ({
      name,
      copiedFrom: pick.source,
      hash: pick.hash,
      upstream: upstream.get(name)?.source ?? "local/custom",
    })),
};

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Unique skills: ${report.totalUnique}`);
  console.log(`Eva manifest: ${report.evaManifestCount}`);
  console.log(`Vmem manifest: ${report.vmemManifestCount}`);
  if (conflicts.length) {
    console.log(`\nConflicts (${conflicts.length}):`);
    for (const c of conflicts) {
      console.log(`  ${c.name}:`);
      for (const v of c.variants) console.log(`    - ${v.source} (${v.hash})`);
    }
  }
}

if (args.has("--copy")) {
  const skillsRoot = join(REPO_ROOT, "skills");
  mkdirSync(skillsRoot, { recursive: true });

  for (const [name, pick] of picks) {
    const dest = join(skillsRoot, name);
    copySkill(pick.path, dest);
    console.log(`Copied ${name} <- ${pick.source}`);
  }

  mkdirSync(join(REPO_ROOT, "manifests"), { recursive: true });
  writeFileSync(join(REPO_ROOT, "manifests", "eva.json"), JSON.stringify(manifests.eva, null, 2) + "\n");
  writeFileSync(join(REPO_ROOT, "manifests", "vmem.json"), JSON.stringify(manifests.vmem, null, 2) + "\n");
  writeFileSync(join(REPO_ROOT, "ATTRIBUTION.md"), buildAttribution(allNames, upstream, picks));

  console.log(`\nWrote manifests/eva.json (${manifests.eva.length} skills)`);
  console.log(`Wrote manifests/vmem.json (${manifests.vmem.length} skills)`);
  console.log("Wrote ATTRIBUTION.md");
}
