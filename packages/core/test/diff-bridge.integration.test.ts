import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runRustDiff } from "../src/index.js";

describe("runRustDiff integration", () => {
  it("invokes the native diff binary and parses JSON", async () => {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    const fixtureRoot = path.resolve(moduleDir, "../../../fixtures");
    const binaryPath = path.resolve(moduleDir, "../../../native/vision-diff/target/debug/vision-diff");
    const result = await runRustDiff(path.join(fixtureRoot, "frame-0.pgm"), path.join(fixtureRoot, "frame-1.pgm"), { binaryPath });
    expect(result.diffScore).toBeGreaterThan(0);
    expect(result.changedRegions.length).toBeGreaterThan(0);
  }, 30_000);
});
