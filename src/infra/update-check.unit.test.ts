import { describe, expect, it } from "vitest";
import { compareSemverStrings, formatGitInstallLabel } from "./update-check.js";

describe("compareSemverStrings", () => {
  it("returns null if either string is null or invalid", () => {
    expect(compareSemverStrings(null, "1.0.0")).toBeNull();
    expect(compareSemverStrings("1.0.0", null)).toBeNull();
    expect(compareSemverStrings("invalid", "1.0.0")).toBeNull();
  });

  it("returns 0 for equal versions", () => {
    expect(compareSemverStrings("1.2.3", "1.2.3")).toBe(0);
    expect(compareSemverStrings("2.0.0-beta.1", "2.0.0-beta.1")).toBe(0);
  });

  it("returns -1 if a < b", () => {
    expect(compareSemverStrings("1.2.2", "1.2.3")).toBe(-1);
    expect(compareSemverStrings("1.1.9", "1.2.0")).toBe(-1);
    expect(compareSemverStrings("0.9.9", "1.0.0")).toBe(-1);
  });

  it("returns 1 if a > b", () => {
    expect(compareSemverStrings("1.2.4", "1.2.3")).toBe(1);
    expect(compareSemverStrings("1.3.0", "1.2.9")).toBe(1);
    expect(compareSemverStrings("2.0.0", "1.9.9")).toBe(1);
  });
});

describe("formatGitInstallLabel", () => {
  it("returns null if installKind is not git", () => {
    expect(
      formatGitInstallLabel({ installKind: "package", root: "/", packageManager: "npm" }),
    ).toBeNull();
  });

  it("formats branch and sha", () => {
    const label = formatGitInstallLabel({
      installKind: "git",
      root: "/",
      packageManager: "pnpm",
      git: {
        root: "/",
        branch: "main",
        sha: "abcdef1234567890",
        tag: null,
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
    });
    expect(label).toBe("main · @ abcdef12");
  });

  it("formats tag and sha in detached HEAD", () => {
    const label = formatGitInstallLabel({
      installKind: "git",
      root: "/",
      packageManager: "pnpm",
      git: {
        root: "/",
        branch: "HEAD",
        sha: "12345678abcdefgh",
        tag: "v1.0.0",
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
    });
    expect(label).toBe("detached · tag v1.0.0 · @ 12345678");
  });
});
