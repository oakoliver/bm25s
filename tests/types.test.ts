/**
 * Compiles the README quickstart and the retrieve() type expectations under
 * --strict, so the public types stay usable without casts.
 */
import { describe, it, expect } from "bun:test";
import * as path from "path";

describe("Types", () => {
  it("README quickstart, retrieve() and tokenize() types compile under --strict", () => {
    const root = path.join(import.meta.dir, "..");
    const proc = Bun.spawnSync(
      [
        path.join(root, "node_modules/.bin/tsc"),
        "--noEmit", "--strict", "--skipLibCheck",
        "--module", "esnext", "--moduleResolution", "bundler", "--target", "es2022",
        "--types", "node",
        "tests/types/quickstart.ts", "tests/types/retrieve.ts", "tests/types/tokenize.ts",
      ],
      { cwd: root },
    );
    expect(proc.stdout.toString()).toBe("");
    expect(proc.exitCode).toBe(0);
  });
});
