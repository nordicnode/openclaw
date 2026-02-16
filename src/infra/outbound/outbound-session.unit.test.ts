import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveOutboundSessionRoute } from "./outbound-session.js";

// Mock the dependencies to isolate the routing logic.
vi.mock("../../discord/targets.js", () => ({
  parseDiscordTarget: vi.fn((target) => {
    if (target === "user123") {
      return { kind: "user", id: "user123" };
    }
    if (target === "chan456") {
      return { kind: "channel", id: "chan456" };
    }
    return null;
  }),
}));

vi.mock("../../telegram/targets.js", () => ({
  parseTelegramTarget: vi.fn((target) => ({ chatId: target, messageThreadId: undefined })),
}));

vi.mock("../../telegram/inline-buttons.js", () => ({
  resolveTelegramTargetChatType: vi.fn(() => "direct"),
}));

describe("resolveOutboundSessionRoute", () => {
  const mockConfig = {
    session: {
      dmScope: "per-channel-peer",
    },
  } as unknown as OpenClawConfig;

  it("returns null for empty target", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: mockConfig,
      channel: "discord",
      agentId: "main",
      target: "",
    });
    expect(route).toBeNull();
  });

  it("resolves discord DM session", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: mockConfig,
      channel: "discord",
      agentId: "main",
      target: "user123",
    });
    expect(route).not.toBeNull();
    expect(route?.chatType).toBe("direct");
    expect(route?.sessionKey).toContain("discord:direct:user123");
  });

  it("resolves discord channel session", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: mockConfig,
      channel: "discord",
      agentId: "main",
      target: "chan456",
    });
    expect(route).not.toBeNull();
    expect(route?.chatType).toBe("channel");
    expect(route?.sessionKey).toContain("discord:channel:chan456");
  });

  it("resolves telegram direct session", async () => {
    const route = await resolveOutboundSessionRoute({
      cfg: mockConfig,
      channel: "telegram",
      agentId: "main",
      target: "123456",
    });
    expect(route).not.toBeNull();
    expect(route?.chatType).toBe("direct");
    expect(route?.sessionKey).toContain("telegram:direct:123456");
  });
});
