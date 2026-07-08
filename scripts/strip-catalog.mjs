#!/usr/bin/env node
/**
 * Remove third-party skills from the catalog; keep CUSTOM_SKILLS only.
 * Usage: node scripts/strip-catalog.mjs
 */
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { CUSTOM_SKILLS } from "./custom-skills.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsRoot = resolve(__dirname, "..", "skills");

const keep = new Set(CUSTOM_SKILLS);
let removed = 0;

for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (keep.has(entry.name)) continue;
  const dir = join(skillsRoot, entry.name);
  rmSync(dir, { recursive: true, force: true });
  console.log(`removed skills/${entry.name}`);
  removed++;
}

console.log(`\nKept ${keep.size} custom skills, removed ${removed}`);
