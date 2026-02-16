import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { getHistoryLimitFromSessionKey, limitHistoryTurns } from "./history.js";

describe("limitHistoryTurns", () => {
  it("returns all messages if limit is undefined or 0", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: "hello", timestamp: 2 },
    ];
    expect(limitHistoryTurns(messages, undefined)).toBe(messages);
    expect(limitHistoryTurns(messages, 0)).toBe(messages);
  });

  it("limits history to specified number of user turns", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "1", timestamp: 1 },
      { role: "assistant", content: "a", timestamp: 2 },
      { role: "user", content: "2", timestamp: 3 },
      { role: "assistant", content: "b", timestamp: 4 },
      { role: "user", content: "3", timestamp: 5 },
      { role: "assistant", content: "c", timestamp: 6 },
    ];

    // Limit to 2 user turns should keep (user 2, assistant b, user 3, assistant c)
    const limited = limitHistoryTurns(messages, 2);
    expect(limited).toHaveLength(4);
    expect(limited[0].content).toBe("2");
    expect(limited[2].content).toBe("3");
  });

  it("includes all messages if user turns are fewer than limit", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "1", timestamp: 1 },
      { role: "assistant", content: "a", timestamp: 2 },
    ];
    expect(limitHistoryTurns(messages, 5)).toBe(messages);
  });
});

describe("getHistoryLimitFromSessionKey", () => {
  const mockConfig = {
    channels: {
      telegram: {
        dmHistoryLimit: 10,
        historyLimit: 50,
        dms: {
          user123: { historyLimit: 5 },
        },
      } as unknown,
      slack: {
        dmHistoryLimit: 20,
      } as unknown,
    },
  } as unknown as OpenClawConfig;

  it("returns undefined for missing session key or config", () => {
    expect(getHistoryLimitFromSessionKey(undefined, mockConfig)).toBeUndefined();
    expect(getHistoryLimitFromSessionKey("key", undefined)).toBeUndefined();
  });

  it("resolves default dmHistoryLimit", () => {
    // agent:main:telegram:dm:user456
    const limit = getHistoryLimitFromSessionKey("agent:main:telegram:dm:user456", mockConfig);
    expect(limit).toBe(10);
  });

  it("resolves per-user DM override", () => {
    const limit = getHistoryLimitFromSessionKey("agent:main:telegram:direct:user123", mockConfig);
    expect(limit).toBe(5);
  });

  it("resolves group history limit", () => {
    const limit = getHistoryLimitFromSessionKey("agent:main:telegram:group:-100123", mockConfig);
    expect(limit).toBe(50);
  });

  it("handles thread suffixes", () => {
    const limit = getHistoryLimitFromSessionKey(
      "agent:main:telegram:direct:user123:thread:999",
      mockConfig,
    );
    expect(limit).toBe(5);
  });
});
