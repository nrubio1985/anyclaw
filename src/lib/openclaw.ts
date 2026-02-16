/**
 * OpenClaw integration layer
 *
 * Connects to the local OpenClaw gateway to:
 * 1. Create new agents (workspaces + routing rules)
 * 2. Generate QR codes for WhatsApp linking
 * 3. Monitor agent sessions
 *
 * The gateway runs on the same server at ws://127.0.0.1:18789
 * and has an HTTP API on port 3334.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw";
const AGENTS_BASE_DIR = process.env.AGENTS_BASE_DIR || "/root/agents/anyclaw";
const OPENCLAW_GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT || "18789";

export interface OpenClawAgentConfig {
  agentId: string;
  name: string;
  identityMd: string;
  userMd?: string;
  model?: string;
}

/**
 * Creates an agent workspace on disk with IDENTITY.md and optional USER.md
 */
export function createAgentWorkspace(config: OpenClawAgentConfig): string {
  const workspaceDir = path.join(AGENTS_BASE_DIR, config.agentId);

  // Create workspace directory
  fs.mkdirSync(workspaceDir, { recursive: true });

  // Write IDENTITY.md
  fs.writeFileSync(
    path.join(workspaceDir, "IDENTITY.md"),
    config.identityMd,
    "utf-8"
  );

  // Write USER.md if provided
  if (config.userMd) {
    fs.writeFileSync(
      path.join(workspaceDir, "USER.md"),
      config.userMd,
      "utf-8"
    );
  }

  // Write a minimal MEMORY.md
  fs.writeFileSync(
    path.join(workspaceDir, "MEMORY.md"),
    `# Memory for ${config.name}\n\nCreated: ${new Date().toISOString()}\n`,
    "utf-8"
  );

  return workspaceDir;
}

/**
 * Registers the agent with OpenClaw's agent system
 */
export function registerAgent(
  agentId: string,
  workspacePath: string,
  displayName: string
): { success: boolean; error?: string } {
  try {
    const cmd = `${OPENCLAW_BIN} agents add "${agentId}" --workspace "${workspacePath}" --display-name "${displayName}" --model "anthropic/claude-sonnet-4-20250514" 2>&1`;
    const output = execSync(cmd, { encoding: "utf-8", timeout: 15000 });
    return { success: true };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message: string };
    return { success: false, error: error.stderr || error.message };
  }
}

/**
 * Adds a routing rule so the agent responds to a specific WhatsApp group or DM
 */
export function addRoutingRule(
  agentId: string,
  ruleType: "group" | "dm",
  peerId: string
): { success: boolean; error?: string } {
  try {
    const peerPrefix = ruleType === "group" ? "group:" : "";
    const cmd = `${OPENCLAW_BIN} agents route add "${agentId}" --channel whatsapp --peer "${peerPrefix}${peerId}" 2>&1`;
    execSync(cmd, { encoding: "utf-8", timeout: 15000 });
    return { success: true };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message: string };
    return { success: false, error: error.stderr || error.message };
  }
}

/**
 * Gets the status of the OpenClaw gateway
 */
export function getGatewayStatus(): {
  running: boolean;
  agents: number;
  sessions: number;
} {
  try {
    const output = execSync(`${OPENCLAW_BIN} status --json 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    const status = JSON.parse(output);
    return {
      running: true,
      agents: status.agents?.length || 0,
      sessions: status.sessions?.active || 0,
    };
  } catch {
    return { running: false, agents: 0, sessions: 0 };
  }
}

/**
 * Lists all registered agents
 */
export function listAgents(): string {
  try {
    return execSync(`${OPENCLAW_BIN} agents list 2>&1`, {
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch {
    return "Error listing agents";
  }
}

/**
 * Provisions a complete agent: workspace + registration + routing
 * This is the main function called from the API when a user creates an agent.
 */
export function provisionAgent(config: OpenClawAgentConfig & {
  groupId?: string;
  dmPhone?: string;
}): {
  success: boolean;
  workspacePath?: string;
  error?: string;
} {
  // 1. Create workspace
  const workspacePath = createAgentWorkspace(config);

  // 2. Register with OpenClaw
  const reg = registerAgent(config.agentId, workspacePath, config.name);
  if (!reg.success) {
    return { success: false, error: `Registration failed: ${reg.error}` };
  }

  // 3. Add routing rule if specified
  if (config.groupId) {
    const route = addRoutingRule(config.agentId, "group", config.groupId);
    if (!route.success) {
      return { success: false, workspacePath, error: `Routing failed: ${route.error}` };
    }
  }

  if (config.dmPhone) {
    const route = addRoutingRule(config.agentId, "dm", config.dmPhone);
    if (!route.success) {
      return { success: false, workspacePath, error: `DM routing failed: ${route.error}` };
    }
  }

  return { success: true, workspacePath };
}
