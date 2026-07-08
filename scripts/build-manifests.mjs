#!/usr/bin/env node
/**
 * Build eva/vmem manifests: custom (vvedantb/skills) + upstream groups.
 * Usage: node scripts/build-manifests.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

import { CUSTOM_SKILLS } from "./custom-skills.mjs";

const EVA_MANIFEST = [
  "agent-browser", "brandkit", "caveman", "caveman-commit", "caveman-compress",
  "caveman-help", "caveman-review", "clerk", "clerk-backend-api", "clerk-nextjs-patterns",
  "clerk-setup", "clerk-testing", "clerk-webhooks", "code-structure",
  "convex-create-component", "convex-dev-workflow", "convex-migration-helper",
  "convex-performance-audit", "convex-rules", "convex-setup-auth",
  "design-taste-frontend", "design-taste-frontend-v1", "eva-product-video",
  "full-output-enforcement", "gpt-taste", "grill-me", "high-end-visual-design", "how",
  "image-to-code", "imagegen-frontend-mobile", "imagegen-frontend-web",
  "improve-codebase-architecture", "industrial-brutalist-ui", "make-interfaces-feel-better",
  "minimalist-ui", "no-ui-flash", "quality-code", "redesign-existing-projects",
  "stitch-design-taste", "svg-animations", "transitions-dev", "ubiquitous-language",
  "vercel-composition-patterns", "vercel-react-best-practices", "web-design-guidelines",
  "to-spec", "write-better-error-messages", "zoom-out",
];

const VMEM_MANIFEST = [
  "agent-browser", "brandkit", "caveman", "caveman-commit", "caveman-compress",
  "caveman-help", "caveman-review", "code-structure", "convex-agent",
  "convex-create-component", "convex-dev-workflow", "convex-migration-helper",
  "convex-performance-audit", "convex-rules", "convex-setup-auth", "design-an-interface",
  "design-taste-frontend", "design-taste-frontend-v1", "edit-article", "einstein-simplify",
  "elite-powerpoint-designer", "framer-motion-animator", "full-output-enforcement",
  "git-guardrails-claude-code", "gpt-taste", "grill-me", "high-end-visual-design", "how",
  "image-to-code", "imagegen-frontend-mobile", "imagegen-frontend-web",
  "improve-codebase-architecture", "industrial-brutalist-ui", "make-interfaces-feel-better",
  "migrate-to-shoehorn", "minimalist-ui", "neo4j-cypher-guide", "neo4j-cypher-skill",
  "neon-postgres", "no-ui-flash", "to-tickets", "quality-code",
  "redesign-existing-projects", "request-refactor-plan", "setup-pre-commit",
  "stitch-design-taste", "stop-slop", "svg-animations", "tdd", "text-to-lottie",
  "transitions-dev", "triage", "ubiquitous-language", "expo-upgrade",
  "vercel-composition-patterns", "vercel-react-best-practices", "web-design-guidelines",
  "to-spec", "writing-great-skills", "write-better-error-messages",
];

/** Skills not in .bak lockfiles but needed for full manifests. */
const EXTRA_UPSTREAM = {
  "grill-me": "mattpocock/skills",
  "improve-codebase-architecture": "mattpocock/skills",
  "ubiquitous-language": "mattpocock/skills",
  "to-spec": "mattpocock/skills",
  "to-tickets": "mattpocock/skills",
  "writing-great-skills": "mattpocock/skills",
  "triage": "mattpocock/skills",
  "vercel-composition-patterns": "vercel-labs/agent-skills",
  "vercel-react-best-practices": "vercel-labs/agent-skills",
  "web-design-guidelines": "vercel-labs/agent-skills",
  "agent-browser": "vvedantb/skills",
  "code-structure": "vvedantb/skills",
  "convex-dev-workflow": "vvedantb/skills",
  "convex-rules": "vvedantb/skills",
  "eva-product-video": "vvedantb/skills",
  "how": "vvedantb/skills",
  "svg-animations": "vvedantb/skills",
  "zoom-out": "vvedantb/skills",
  "expo-upgrade": "expo/skills",
  "convex-agent": "vvedantb/skills",
};

function loadUpstreamFromLock(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  const lock = JSON.parse(readFileSync(path, "utf8"));
  for (const [name, entry] of Object.entries(lock.skills ?? {})) {
    map.set(name, entry.source);
  }
  return map;
}

function buildManifest(skillNames, ...upstreamMaps) {
  const custom = [];
  const bySource = new Map();
  const merged = new Map();
  for (const map of upstreamMaps) {
    for (const [name, source] of map) merged.set(name, source);
  }
  for (const [name, source] of Object.entries(EXTRA_UPSTREAM)) {
    if (!merged.has(name)) merged.set(name, source);
  }

  for (const name of skillNames) {
    if (CUSTOM_SKILLS.includes(name)) {
      custom.push(name);
      continue;
    }

    const source = merged.get(name) ?? null;

    if (!source || source === "vvedantb/skills") {
      throw new Error(`No upstream source for skill: ${name}`);
    }

    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(name);
  }

  const upstream = [...bySource.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, skills]) => ({
      source,
      skills: [...skills].sort(),
    }));

  custom.sort();
  return { custom, upstream };
}

const evaUpstream = loadUpstreamFromLock(resolve(ROOT, "..", "eva", "skills-lock.json.bak"));
const vmemUpstream = loadUpstreamFromLock(resolve(ROOT, "..", "vmem", "skills-lock.json.bak"));
const allUpstream = new Map([...evaUpstream, ...vmemUpstream]);

const eva = buildManifest(EVA_MANIFEST, allUpstream);
const vmem = buildManifest(VMEM_MANIFEST, allUpstream);

writeFileSync(join(ROOT, "manifests", "eva.json"), JSON.stringify(eva, null, 2) + "\n");
writeFileSync(join(ROOT, "manifests", "vmem.json"), JSON.stringify(vmem, null, 2) + "\n");

console.log(`eva: ${eva.custom.length} custom + ${eva.upstream.reduce((n, g) => n + g.skills.length, 0)} upstream`);
console.log(`vmem: ${vmem.custom.length} custom + ${vmem.upstream.reduce((n, g) => n + g.skills.length, 0)} upstream`);
