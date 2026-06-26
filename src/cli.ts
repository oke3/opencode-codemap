#!/usr/bin/env node

/**
 * CLI entry point for @groundzero/opencode-codemap.
 *
 * Usage:
 *   opencode-codemap                  # scan + generate current dir
 *   opencode-codemap scan [path]      # scan only, save .scan.json
 *   opencode-codemap generate [path]  # generate from existing .scan.json
 *   opencode-codemap init [path]      # interactive scan + generate
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { scan, generate, buildProject } from "./index.js";

const pkg = { version: "0.1.0", description: "Scan any codebase, auto-generate OpenCode config. Solves the cold start problem." };

const program = new Command();

program
  .name("opencode-codemap")
  .description(pkg.description)
  .version(pkg.version);

// ── Default: scan + generate ─────────────────────────────

program
  .argument("[path]", "project root", ".")
  .option("-o, --output <path>", "output directory (default: project root)")
  .action(async (path: string, options: { output?: string }) => {
    const root = resolve(path);
    const outDir = resolve(options.output ?? root);

    console.log(`🔍 Scanning ${root} …`);

    const { model, files } = await buildProject(root);

    for (const file of files) {
      const filePath = join(outDir, file.path);
      writeFileSync(filePath, file.content, "utf-8");
      console.log(`  ✓ ${file.path}`);
    }

    console.log(`\nDone. Generated ${files.length} file(s) for ${model.name}.`);
  });

// ── Scan subcommand ──────────────────────────────────────

program
  .command("scan")
  .description("Analyze project and save scan data")
  .argument("[path]", "project root", ".")
  .action(async (path: string) => {
    const root = resolve(path);
    const model = await scan(root);
    const scanPath = join(root, ".scan.json");
    writeFileSync(scanPath, JSON.stringify(model, null, 2), "utf-8");
    console.log(`✓ Scanned ${model.name} (${model.fileStructure.totalFiles} files)`);
    console.log(`  Primary: ${model.frameworks.primary ?? "none"}`);
    console.log(`  Test: ${model.conventions.testRunner ?? "none"}`);
    console.log(`  Scan saved to ${scanPath}`);
  });

// ── Generate subcommand ──────────────────────────────────

program
  .command("generate")
  .description("Generate config files from existing .scan.json")
  .argument("[path]", "project root (reads .scan.json)", ".")
  .action(async (path: string) => {
    const root = resolve(path);
    const scanPath = join(root, ".scan.json");
    if (!existsSync(scanPath)) {
      console.error(`✗ No .scan.json found at ${root}. Run "opencode-codemap scan" first.`);
      process.exit(1);
    }
    const model = JSON.parse(readFileSync(scanPath, "utf-8"));
    const files = await generate(model);
    for (const file of files) {
      const filePath = join(root, file.path);
      writeFileSync(filePath, file.content, "utf-8");
      console.log(`  ✓ ${file.path}`);
    }
    console.log(`\nDone. Generated ${files.length} file(s).`);
  });

// ── Parse ────────────────────────────────────────────────

program.parse(process.argv);
