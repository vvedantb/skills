#!/usr/bin/env node
/**
 * Bootstrap a project's skills from a manifest in this repo.
 *
 * Usage:
 *   node scripts/bootstrap-project.mjs --manifest eva
 *   node scripts/bootstrap-project.mjs --manifest vmem --project ../vmem
 *   node scripts/bootstrap-project.mjs --manifest eva --catalog ../skills
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {
    manifest: null,
    project: process.cwd(),
    catalog: resolve(__dirname, ".."),
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--manifest" || arg === "-m") opts.manifest = argv[++i];
    else if (arg === "--project" || arg === "-p") opts.project = resolve(argv[++i]);
    else if (arg === "--catalog" || arg === "-c") opts.catalog = resolve(argv[++i]);
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/bootstrap-project.mjs --manifest <eva|vmem> [--project <dir>] [--catalog <dir>]`);
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
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const opts = parseArgs(process.argv.slice(2));
const manifestPath = join(opts.catalog, "manifests", `${opts.manifest}.json`);

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const skills = JSON.parse(readFileSync(manifestPath, "utf8"));
console.log(`Bootstrapping ${skills.length} skills into ${opts.project} from ${manifestPath}`);

for (const name of skills) {
  const pkg = `vvedantb/skills@${name}`;
  if (opts.dryRun) {
    console.log(`[dry-run] npx skills add ${pkg} -y`);
    continue;
  }
  run("npx", ["skills", "add", pkg, "-y"], opts.project);
}

console.log(`\nDone. Verify skills-lock.json and .agents/skills/ in ${opts.project}`);
