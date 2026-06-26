import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "../fixtures");

describe("languages scanner", () => {
  it("detects Python project from pyproject.toml", async () => {
    const model = await scan(resolve(fixtures, "python-app"));
    expect(model.langTooling.primary).toBe("Python");
    expect(model.langTooling.python).not.toBeNull();
    expect(model.langTooling.python!.testRunner).toBe("pytest");
    expect(model.langTooling.python!.linter).toBe("ruff");
    expect(model.langTooling.python!.formatter).toBe("ruff");
    expect(model.langTooling.python!.buildTool).toBe("hatch");
  });

  it("detects Go project from go.mod", async () => {
    const model = await scan(resolve(fixtures, "go-app"));
    expect(model.langTooling.primary).toBe("Go");
    expect(model.langTooling.go).not.toBeNull();
    expect(model.langTooling.python).toBeNull();
    expect(model.langTooling.rust).toBeNull();
  });

  it("detects Rust project from Cargo.toml", async () => {
    const model = await scan(resolve(fixtures, "rust-app"));
    expect(model.langTooling.primary).toBe("Rust");
    expect(model.langTooling.rust).not.toBeNull();
    expect(model.langTooling.python).toBeNull();
    expect(model.langTooling.go).toBeNull();
  });

  it("skips detection for JS project (no lang config files)", async () => {
    const model = await scan(resolve(fixtures, "react-app"));
    expect(model.langTooling.primary).toBeNull();
    expect(model.langTooling.python).toBeNull();
    expect(model.langTooling.go).toBeNull();
    expect(model.langTooling.rust).toBeNull();
  });

  it("populates conventions for Python project", async () => {
    const model = await scan(resolve(fixtures, "python-app"));
    expect(model.conventions.testRunner).toBe("pytest");
    expect(model.conventions.linter).toBe("ruff");
    expect(model.conventions.formatter).toBe("ruff");
  });

  it("populates conventions for Go project (stdlib defaults)", async () => {
    const model = await scan(resolve(fixtures, "go-app"));
    expect(model.conventions.testRunner).toBe("go test");
    expect(model.conventions.formatter).toBe("gofmt");
  });

  it("populates conventions for Rust project (cargo defaults)", async () => {
    const model = await scan(resolve(fixtures, "rust-app"));
    expect(model.conventions.testRunner).toBe("cargo test");
    expect(model.conventions.formatter).toBe("rustfmt");
  });
});
