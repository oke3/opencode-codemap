#!/usr/bin/env node

/**
 * CLI entry point for @oke3/opencode-codemap.
 *
 * Usage:
 *   opencode-codemap                    # scan + generate current dir
 *   opencode-codemap scan [path]        # scan only, save .scan.json
 *   opencode-codemap generate [path]    # generate from existing .scan.json
 *   opencode-codemap --dry-run          # simulate, no files written
 *   opencode-codemap --force            # overwrite all files
 *   opencode-codemap --quiet            # minimal output
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { scan, generate, buildProject } from "./index.js";
import type { GeneratedFile } from "./core/generator.js";

// ── Colors (zero deps) ───────────────────────────────────

const c = (code: number, s: string) => `\x1b[${code}m${s}\x1b[0m`;
const bold = (s: string) => c(1, s);
const dim = (s: string) => c(2, s);
const cyan = (s: string) => c(36, s);
const green = (s: string) => c(32, s);
const yellow = (s: string) => c(33, s);
const red = (s: string) => c(31, s);
const gray = (s: string) => c(90, s);

// ── Helpers ──────────────────────────────────────────────

function writeFile(dir: string, path: string, content: string) {
  const abs = join(dir, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
}

function plural(n: number, w: string) {
  if (n === 1) return `${n} ${w}`;
  // Handle -ed endings: "skipped" → "skipped", "generated" → "generated"
  // (invariant for past participles used as adjectives)
  return `${n} ${w}`;
}

interface CLIOptions {
  output?: string;
  dryRun?: boolean;
  force?: boolean;
  quiet?: boolean;
}

function renderFiles(
  files: GeneratedFile[],
  outDir: string,
  opts: CLIOptions,
): { skipped: number; written: number } {
  let written = 0;
  let skipped = 0;

  for (const file of files) {
    const abs = join(outDir, file.path);
    const exists = existsSync(abs);

    if (exists && !file.overwrite && !opts.force) {
      if (!opts.quiet) console.log(`  ${gray("~")} ${dim(file.path)} ${yellow("(exists, skip)")}`);
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      if (!opts.quiet) console.log(`  ${gray("~")} ${dim(file.path)} ${dim("(dry-run)")}`);
      written++;
      continue;
    }

    writeFile(outDir, file.path, file.content);
    if (!opts.quiet) console.log(`  ${green("✓")} ${file.path}`);
    written++;
  }

  return { skipped, written };
}

function renderFilesUpdate(
  files: GeneratedFile[],
  outDir: string,
  opts: CLIOptions,
): { unchanged: number; updated: number; created: number } {
  let unchanged = 0;
  let updated = 0;
  let created = 0;

  for (const file of files) {
    const abs = join(outDir, file.path);
    const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;

    if (existing === null) {
      if (opts.dryRun) {
        if (!opts.quiet) console.log(`  ${green("+")} ${file.path} ${dim("(dry-run)")}`);
        created++;
        continue;
      }
      writeFile(outDir, file.path, file.content);
      if (!opts.quiet) console.log(`  ${green("+")} ${file.path}`);
      created++;
    } else if (existing === file.content) {
      if (!opts.quiet) console.log(`  ${green("✓")} ${file.path} ${dim("unchanged")}`);
      unchanged++;
    } else {
      if (opts.dryRun) {
        if (!opts.quiet) console.log(`  ${yellow("~")} ${file.path} ${dim("(would update)")}`);
        updated++;
        continue;
      }
      writeFile(outDir, file.path, file.content);
      if (!opts.quiet) console.log(`  ${yellow("~")} ${file.path} ${dim("updated")}`);
      updated++;
    }
  }

  return { unchanged, updated, created };
}

function printSummary(
  modelName: string,
  files: GeneratedFile[],
  written: number,
  skipped: number,
  opts: CLIOptions,
) {
  if (opts.quiet) return;

  const dryLabel = opts.dryRun ? dim(" (dry-run)") : "";

  const parts = [`${green(String(written))} ${plural(written, "file")}`];
  if (skipped > 0) parts.push(`${yellow(String(skipped))} ${plural(skipped, "skipped")}`);
  console.log(`\n${bold(cyan("done"))}  ${bold(modelName)} — ${parts.join(", ")}${dryLabel}`);

  if (!opts.dryRun && written > 0) {
    const fw = files.find((f) => f.path === "AGENTS.md")?.content;
    if (fw) {
      // Print framework summary
      const lang = fw.match(/\*\*(.+?)\*\*/)?.[1];
      const framework = fw.match(/Framework: \*\*(.+?)\*\*/)?.[1];
      if (framework) console.log(`  ${dim("├─")} ${gray(framework)} ${lang ? gray(lang) : ""}`);
    }
  }
}

// ── Shared flags ─────────────────────────────────────────

const sharedFlags = (cmd: Command) =>
  cmd
    .option("-d, --dry-run", "simulate without writing files")
    .option("-f, --force", "overwrite existing files")
    .option("-q, --quiet", "minimal output")
    .option("-o, --output <path>", "output directory (default: project root)");

// ── App ──────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

const program = new Command();

program
  .name("opencode-codemap")
  .description(pkg.description)
  .version(pkg.version);

// ── Default: scan + generate ─────────────────────────────

sharedFlags(
  program.argument("[path]", "project root", "."),
).action(async (path: string, options: CLIOptions) => {
  const root = resolve(path);
  const outDir = resolve(options.output ?? root);

  if (!options.quiet) console.log(bold(cyan("codemap")) + dim(" — OpenCode project setup\n"));
  if (!options.quiet) console.log(`  ${dim("scan")}  ${root}`);

  const { model, files } = await buildProject(root);

  if (!options.quiet) {
    const fw = model.frameworks.primary ?? "no framework detected";
    console.log(`  ${dim("found")} ${model.fileStructure.totalFiles} files — ${gray(fw)}`);
    process.stdout.write(dim("  gen   "));
  }

  const { written, skipped } = renderFiles(files, outDir, options);
  printSummary(model.name, files, written, skipped, options);
});

// ── Scan subcommand ──────────────────────────────────────

program
  .command("scan")
  .description("Analyze project and save scan data")
  .argument("[path]", "project root", ".")
  .option("-q, --quiet", "minimal output")
  .action(async (path: string, options: { quiet?: boolean }) => {
    const root = resolve(path);
    const model = await scan(root);
    const scanPath = join(root, ".scan.json");
    writeFileSync(scanPath, JSON.stringify(model, null, 2), "utf-8");

    if (options.quiet) return;

    console.log(`${green("✓")} ${bold(model.name)}`);
    console.log(`  ${dim("files")}   ${model.fileStructure.totalFiles}`);
    console.log(`  ${dim("fw")}     ${model.frameworks.primary ?? dim("none")}`);
    console.log(`  ${dim("test")}   ${model.conventions.testRunner ?? dim("none")}`);
    console.log(`  ${dim("lint")}   ${model.conventions.linter ?? dim("none")}`);
    console.log(`  ${dim("fmt")}    ${model.conventions.formatter ?? dim("none")}`);
    console.log(`  ${gray("scan →")} ${scanPath}`);
  });

// ── Generate subcommand ──────────────────────────────────

sharedFlags(
  program
    .command("generate")
    .description("Generate config files from existing .scan.json")
    .argument("[path]", "project root (reads .scan.json)", "."),
).action(async (path: string, options: CLIOptions) => {
  const root = resolve(path);
  const scanPath = join(root, ".scan.json");
  if (!existsSync(scanPath)) {
    console.error(`${red("✗")} No .scan.json at ${root}. Run ${cyan("opencode-codemap scan")} first.`);
    process.exit(1);
  }

  const model = JSON.parse(readFileSync(scanPath, "utf-8"));
  const outDir = resolve(options.output ?? root);

  if (!options.quiet) console.log(`${dim("gen")}  ${model.name} → ${outDir}`);

  const files = await generate(model);
  const { written, skipped } = renderFiles(files, outDir, options);
  printSummary(model.name, files, written, skipped, options);
});

// ── Update subcommand ────────────────────────────────────

sharedFlags(
  program
    .command("update")
    .description("Re-scan and update changed files (preserves manual edits)")
    .argument("[path]", "project root", "."),
).action(async (path: string, options: CLIOptions) => {
  const root = resolve(path);
  const outDir = resolve(options.output ?? root);

  if (!options.quiet) console.log(bold(cyan("codemap update")) + dim(" — refresh OpenCode config\n"));
  if (!options.quiet) console.log(`  ${dim("scan")}  ${root}`);

  const { model, files } = await buildProject(root);

  if (!options.quiet) {
    const fw = model.frameworks.primary ?? "no framework detected";
    console.log(`  ${dim("found")} ${model.fileStructure.totalFiles} files — ${gray(fw)}`);
    process.stdout.write(dim("  gen   "));
  }

  const { unchanged, updated, created } = renderFilesUpdate(files, outDir, options);
  if (!options.quiet) {
    const parts: string[] = [];
    if (unchanged > 0) parts.push(`${green(String(unchanged))} unchanged`);
    if (updated > 0) parts.push(`${yellow(String(updated))} updated`);
    if (created > 0) parts.push(`${green(String(created))} new`);
    const dryLabel = options.dryRun ? dim(" (dry-run)") : "";
    console.log(`\n${bold(cyan("done"))}  ${bold(model.name)} — ${parts.join(", ")}${dryLabel}`);
  }
});

// ── Parse ────────────────────────────────────────────────

program.parse(process.argv);
