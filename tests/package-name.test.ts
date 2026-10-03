/**
 * The package was published as bun-bm25s before it became bm25s; the old
 * name must not reach the shipped sources (JSDoc examples, banners).
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("package name", () => {
  it("shipped sources refer to bm25s, not bun-bm25s", () => {
    const src = join(import.meta.dir, "..", "src");
    const stale = readdirSync(src)
      .filter((f) => readFileSync(join(src, f), "utf8").includes("bun-bm25s"));
    expect(stale).toEqual([]);
  });
});

describe("package.json", () => {
  it("does not make plain JavaScript users install TypeScript", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"));
    const required = Object.keys(pkg.peerDependencies ?? {})
      .filter((name) => !pkg.peerDependenciesMeta?.[name]?.optional);
    expect(required).not.toContain("typescript");
  });
});
