import { describe, expect, it } from "vitest";
import { canonicalizeSessionKeyForAgent, isLegacyGroupKey } from "./state-migrations.js";

describe("isLegacyGroupKey", () => {
  it("identifies legacy group keys", () => {
    expect(isLegacyGroupKey("group:123")).toBe(true);
    expect(isLegacyGroupKey("12345@g.us")).toBe(true);
    expect(isLegacyGroupKey("whatsapp:12345@g.us")).toBe(true);
  });

  it("returns false for modern group keys", () => {
    expect(isLegacyGroupKey("agent:main:whatsapp:group:123")).toBe(false);
  });
});

describe("canonicalizeSessionKeyForAgent", () => {
  it("canonicalizes legacy subagent keys", () => {
    const key = canonicalizeSessionKeyForAgent({
      key: "subagent:test",
      agentId: "main",
      mainKey: "main",
    });
    expect(key).toBe("agent:main:subagent:test");
  });

  it("canonicalizes legacy group keys", () => {
    const key = canonicalizeSessionKeyForAgent({
      key: "group:test",
      agentId: "main",
      mainKey: "main",
    });
    expect(key).toBe("agent:main:unknown:group:test");
  });

  it("canonicalizes WhatsApp group keys", () => {
    const key = canonicalizeSessionKeyForAgent({
      key: "12345@g.us",
      agentId: "main",
      mainKey: "main",
    });
    expect(key).toBe("agent:main:whatsapp:group:12345@g.us");
  });
});
