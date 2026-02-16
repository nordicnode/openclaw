import { fetch as realFetch } from "undici";
import { describe, expect, it, vi } from "vitest";
import {
  getBrowserControlServerBaseUrl,
  installBrowserControlServerHooks,
  startBrowserControlServerFromConfig,
} from "./server.control-server.test-harness.js";

const pwMocks = vi.hoisted(() => ({
  cookiesGetViaPlaywright: vi.fn(async () => ({
    cookies: [{ name: "session", value: "abc123" }],
  })),
  storageGetViaPlaywright: vi.fn(async () => ({ values: { token: "value" } })),
  evaluateViaPlaywright: vi.fn(async () => "ok"),
}));

const routeCtxMocks = vi.hoisted(() => {
  const profileCtx = {
    profile: { cdpUrl: "http://127.0.0.1:9222" },
    ensureTabAvailable: vi.fn(async () => ({
      targetId: "tab-1",
      url: "https://example.com",
    })),
    stopRunningBrowser: vi.fn(async () => {}),
  };

  return {
    profileCtx,
    createBrowserRouteContext: vi.fn(() => ({
      state: () => ({ resolved: { evaluateEnabled: false } }),
      forProfile: vi.fn(() => profileCtx),
      mapTabError: vi.fn(() => null),
    })),
  };
});

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => ({
      browser: {
        enabled: true,
        evaluateEnabled: false,
        defaultProfile: "openclaw",
        profiles: {
          openclaw: { cdpPort: 9222, color: "#FF4500" },
        },
      },
    }),
    writeConfigFile: vi.fn(async () => {}),
  };
});

vi.mock("./pw-ai-module.js", () => ({
  getPwAiModule: vi.fn(async () => pwMocks),
}));

vi.mock("./server-context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./server-context.js")>();
  return {
    ...actual,
    createBrowserRouteContext: routeCtxMocks.createBrowserRouteContext,
  };
});

describe("browser control evaluate gating", () => {
  installBrowserControlServerHooks();

  it("blocks act:evaluate but still allows cookies/storage reads", async () => {
    await startBrowserControlServerFromConfig();

    const base = getBrowserControlServerBaseUrl();

    const evalRes = (await realFetch(`${base}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "evaluate", fn: "() => 1" }),
    }).then((r) => r.json())) as { error?: string };

    expect(evalRes.error).toContain("browser.evaluateEnabled=false");
    expect(pwMocks.evaluateViaPlaywright).not.toHaveBeenCalled();

    const cookiesRes = (await realFetch(`${base}/cookies`).then((r) => r.json())) as {
      ok: boolean;
      cookies?: Array<{ name: string }>;
    };
    expect(cookiesRes.ok).toBe(true);
    expect(cookiesRes.cookies?.[0]?.name).toBe("session");
    expect(pwMocks.cookiesGetViaPlaywright).toHaveBeenCalledWith({
      cdpUrl: "http://127.0.0.1:9222",
      targetId: "tab-1",
    });

    const storageRes = (await realFetch(`${base}/storage/local?key=token`).then((r) =>
      r.json(),
    )) as {
      ok: boolean;
      values?: Record<string, string>;
    };
    expect(storageRes.ok).toBe(true);
    expect(storageRes.values).toEqual({ token: "value" });
    expect(pwMocks.storageGetViaPlaywright).toHaveBeenCalledWith({
      cdpUrl: "http://127.0.0.1:9222",
      targetId: "tab-1",
      kind: "local",
      key: "token",
    });
  });
});
