import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  listAgentIds,
  resolveDefaultAgentId,
  resolveSessionAgentId,
  resolveAgentConfig,
  resolveAgentWorkspaceDir,
} from "./agent-scope.js";

describe("agent-scope", () => {
  const mockConfig = {
    agents: {
      list: [
        { id: "agent1", default: true, name: "Agent One", workspace: "~/ws1" },
        { id: "agent2", name: "Agent Two" },
      ],
    },
  } as unknown as OpenClawConfig;

  it("listAgentIds returns all agent IDs", () => {
    expect(listAgentIds(mockConfig)).toEqual(["agent1", "agent2"]);
  });

  it("resolveDefaultAgentId returns the agent marked default", () => {
    expect(resolveDefaultAgentId(mockConfig)).toBe("agent1");
  });

  it("resolveSessionAgentId extracts agent ID from session key", () => {
    expect(resolveSessionAgentId({ sessionKey: "agent:agent2:main", config: mockConfig })).toBe(
      "agent2",
    );
  });

  it("resolveSessionAgentId falls back to default if session key is missing", () => {
    expect(resolveSessionAgentId({ config: mockConfig })).toBe("agent1");
  });

  it("resolveAgentConfig returns configuration for a specific agent", () => {
    const config = resolveAgentConfig(mockConfig, "agent1");
    expect(config?.name).toBe("Agent One");
    expect(config?.workspace).toBe("~/ws1");
  });

  it("resolveAgentWorkspaceDir resolves path for default agent", () => {
    // This relies on internal resolveUserPath which we might need to mock or just check suffix
    const ws = resolveAgentWorkspaceDir(mockConfig, "agent1");
    expect(ws).toMatch(/ws1$/);
  });
});
