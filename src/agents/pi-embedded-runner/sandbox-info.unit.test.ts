import { describe, expect, it } from "vitest";
import { buildEmbeddedSandboxInfo } from "./sandbox-info.js";

describe("buildEmbeddedSandboxInfo", () => {
  it("returns undefined if sandbox is disabled", () => {
    expect(
      buildEmbeddedSandboxInfo({ enabled: false } as unknown as Parameters<
        typeof buildEmbeddedSandboxInfo
      >[0]),
    ).toBeUndefined();
    expect(buildEmbeddedSandboxInfo(undefined)).toBeUndefined();
  });

  it("builds sandbox info if enabled", () => {
    const sandbox = {
      enabled: true,
      workspaceDir: "/ws",
      containerWorkdir: "/cws",
      workspaceAccess: "rw",
      browserAllowHostControl: true,
    };
    const info = buildEmbeddedSandboxInfo(
      sandbox as unknown as Parameters<typeof buildEmbeddedSandboxInfo>[0],
    );
    expect(info?.enabled).toBe(true);
    expect(info?.workspaceDir).toBe("/ws");
    expect(info?.hostBrowserAllowed).toBe(true);
  });

  it("includes elevated info if enabled and allowed", () => {
    const sandbox = { enabled: true };
    const execElevated = { enabled: true, allowed: true, defaultLevel: "ask" };
    const info = buildEmbeddedSandboxInfo(
      sandbox as unknown as Parameters<typeof buildEmbeddedSandboxInfo>[0],
      execElevated as unknown as Parameters<typeof buildEmbeddedSandboxInfo>[1],
    );
    expect(info?.elevated?.allowed).toBe(true);
    expect(info?.elevated?.defaultLevel).toBe("ask");
  });
});
