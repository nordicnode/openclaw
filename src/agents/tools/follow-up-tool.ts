import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";
import { loadConfig } from "../../config/config.js";
import { resolveSessionAgentId } from "../agent-scope.js";
import { callGatewayTool, type GatewayCallOptions } from "./gateway.js";

const FollowUpToolSchema = Type.Object({
  message: Type.String({
    description: "The instructions or prompt for the agent to execute when the follow-up fires.",
  }),
  minutes: Type.Optional(
    Type.Number({
      description: "How many minutes from now to fire the follow-up (default: 5).",
      minimum: 1,
      maximum: 1440, // 24 hours
    }),
  ),
  name: Type.Optional(
    Type.String({
      description: "An optional name for the follow-up task.",
    }),
  ),
  gatewayUrl: Type.Optional(Type.String()),
  gatewayToken: Type.Optional(Type.String()),
});

type FollowUpToolOptions = {
  agentSessionKey?: string;
};

export function createFollowUpTool(opts?: FollowUpToolOptions): AnyAgentTool {
  return {
    label: "Follow Up",
    name: "follow_up",
    description:
      "Schedule an autonomous follow-up turn for yourself at a later time. " +
      "Use this to perform background tasks, check on long-running operations, or remind yourself to take an action. " +
      "The follow-up will run in an isolated session and will announce its result back to the current chat.",
    parameters: FollowUpToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as {
        message: string;
        minutes?: number;
        name?: string;
        gatewayUrl?: string;
        gatewayToken?: string;
      };

      const delayMinutes = params.minutes ?? 5;
      const fireAt = new Date(Date.now() + delayMinutes * 60000);
      const gatewayOpts: GatewayCallOptions = {
        gatewayUrl: params.gatewayUrl,
        gatewayToken: params.gatewayToken,
        timeoutMs: 60_000,
      };

      const cfg = loadConfig();
      const agentId = opts?.agentSessionKey
        ? resolveSessionAgentId({ sessionKey: opts.agentSessionKey, config: cfg })
        : undefined;

      const jobName = params.name || `Follow-up: ${params.message.slice(0, 30)}...`;

      const jobPayload = {
        name: jobName,
        agentId,
        enabled: true,
        deleteAfterRun: true,
        sessionTarget: "isolated",
        wakeMode: "now",
        schedule: {
          kind: "at",
          at: fireAt.toISOString(),
        },
        payload: {
          kind: "agentTurn",
          message: `FOLLOW-UP TASK: ${params.message}`,
        },
        delivery: {
          mode: "announce",
        },
      };

      const result = await callGatewayTool("cron.add", gatewayOpts, jobPayload);

      return {
        ok: true,
        output: `Scheduled follow-up "${jobName}" to fire in ${delayMinutes} minute(s) at ${fireAt.toLocaleTimeString()}.`,
        data: result,
      };
    },
  };
}
