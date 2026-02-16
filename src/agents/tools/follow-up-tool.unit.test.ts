import { describe, expect, it, vi } from "vitest";
import { createFollowUpTool } from "./follow-up-tool.js";

// Mock Gateway call
vi.mock("./gateway.js", () => ({
  callGatewayTool: vi.fn(async () => ({ id: "job-123" })),
}));

describe("follow_up tool", () => {
  it("schedules a follow-up job with default minutes", async () => {
    const { callGatewayTool } = await import("./gateway.js");
    const tool = createFollowUpTool({ agentSessionKey: "agent:main:main" });

    const result = await tool.execute("call-1", {
      message: "Check the build status",
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("5 minute(s)");
    expect(callGatewayTool).toHaveBeenCalledWith(
      "cron.add",
      expect.any(Object),
      expect.objectContaining({
        name: expect.stringContaining("Follow-up"),
        sessionTarget: "isolated",
        deleteAfterRun: true,
        payload: expect.objectContaining({
          message: "FOLLOW-UP TASK: Check the build status",
        }),
      }),
    );
  });

  it("respects custom minutes and name", async () => {
    const { callGatewayTool } = await import("./gateway.js");
    const tool = createFollowUpTool({ agentSessionKey: "agent:main:main" });

    const result = await tool.execute("call-2", {
      message: "Finish the report",
      minutes: 10,
      name: "Report Task",
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("10 minute(s)");
    expect(callGatewayTool).toHaveBeenCalledWith(
      "cron.add",
      expect.any(Object),
      expect.objectContaining({
        name: "Report Task",
      }),
    );
  });
});
