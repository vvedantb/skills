#!/usr/bin/env node
/**
 * Bootstrap a project's skills from a manifest in this repo.
 *
 * Usage:
 *   node scripts/bootstrap-project.mjs --manifest eva
 *   node scripts/bootstrap-project.mjs --manifest vmem --project ../vmem
 *   node scripts/bootstrap-project.mjs --manifest eva --fresh
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG = "vvedantb/skills";

function parseArgs(argv) {
  const opts = {
    manifest: null,
    project: process.cwd(),
    catalog: resolve(__dirname, ".."),
    dryRun: false,
    fresh: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--manifest" || arg === "-m") opts.manifest = argv[++i];
    else if (arg === "--project" || arg === "-p") opts.project = resolve(argv[++i]);
    else if (arg === "--catalog" || arg === "-c") opts.catalog = resolve(argv[++i]);
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--fresh") opts.fresh = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/bootstrap-project.mjs --manifest <eva|vmem> [--project <dir>] [--fresh]`);
      process.exit(0);
    }
  }

  if (!opts.manifest) {
    console.error("Missing --manifest <eva|vmem>");
    process.exit(1);
  }

  return opts;
}

function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  return result.status ?? 1;
}

function loadInstalled(lockPath) {
  const installed = new Map();
  if (!existsSync(lockPath)) return installed;
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  for (const [name, entry] of Object.entries(lock.skills ?? {})) {
    installed.set(name, entry.source);
  }
  return installed;
}

const opts = parseArgs(process.argv.slice(2));
const manifestPath = join(opts.catalog, "manifests", `${opts.manifest}.json`);

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const lockPath = join(opts.project, "skills-lock.json");
const agentsPath = join(opts.project, ".agents", "skills");

if (opts.fresh) {
  if (existsSync(lockPath)) rmSync(lockPath);
  if (existsSync(agentsPath)) rmSync(agentsPath, { recursive: true, force: true });
}

const installed = loadInstalled(lockPath);
const installs = [];

for (const name of manifest.custom ?? []) {
  installs.push({ name, source: CATALOG });
}

for (const group of manifest.upstream ?? []) {
  for (const name of group.skills) {
    installs.push({ name, source: group.source });
  }
}

console.log(
  `Bootstrapping ${installs.length} skills (${manifest.custom?.length ?? 0} custom) into ${opts.project}`,
);

let failed = 0;
for (const { name, source } of installs) {
  if (installed.get(name) === source) {
    console.log(`= skip ${name} (already from ${source})`);
    continue;
  }

  const pkg = `${source}@${name}`;
  if (opts.dryRun) {
    console.log(`[dry-run] npx skills add ${pkg} -y`);
    continue;
  }

  const status = run("npx", ["skills", "add", pkg, "-y"], opts.project);
  if (status !== 0) {
    failed++;
    console.error(`! failed to install ${name} from ${source} (exit ${status})`);
  }
}

if (failed) {
  console.error(`\n${failed} skill(s) failed to install.`);
  process.exit(1);
}

console.log(`\nDone. Verify skills-lock.json and .agents/skills/ in ${opts.project}`);
