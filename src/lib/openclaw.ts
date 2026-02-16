/**
 * OpenClaw integration layer
 *
 * Connects to the local OpenClaw gateway to:
 * 1. Create new agents (workspaces + routing rules)
 * 2. Manage routing bindings in openclaw.json
 * 3. Monitor agent sessions
 *
 * CLI reference (OpenClaw 2026.2.14):
 *   openclaw agents add <name> --workspace <dir> --model <id> [--bind <channel>] --non-interactive
 *   openclaw agents list
 *   openclaw agents delete <name>
 *   openclaw agents set-identity <name>
 *
 * Routing bindings are managed directly in ~/.openclaw/openclaw.json
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw";
const AGENTS_BASE_DIR = process.env.AGENTS_BASE_DIR || "/root/agents/anyclaw";
const OPENCLAW_CONFIG = process.env.OPENCLAW_CONFIG || "/root/.openclaw/openclaw.json";

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

  fs.mkdirSync(workspaceDir, { recursive: true });

  fs.writeFileSync(
    path.join(workspaceDir, "IDENTITY.md"),
    config.identityMd,
    "utf-8"
  );

  if (config.userMd) {
    fs.writeFileSync(
      path.join(workspaceDir, "USER.md"),
      config.userMd,
      "utf-8"
    );
  }

  fs.writeFileSync(
    path.join(workspaceDir, "MEMORY.md"),
    `# Memory for ${config.name}\n\nCreated: ${new Date().toISOString()}\n`,
    "utf-8"
  );

  return workspaceDir;
}

/**
 * Registers the agent with OpenClaw CLI
 * Uses: openclaw agents add <name> --workspace <dir> --model <id> --non-interactive
 */
export function registerAgent(
  agentId: string,
  workspacePath: string,
  _displayName: string
): { success: boolean; output?: string; error?: string } {
  try {
    const model = process.env.OPENCLAW_MODEL || "anthropic/claude-sonnet-4-20250514";
    const cmd = `${OPENCLAW_BIN} agents add "${agentId}" --workspace "${workspacePath}" --model "${model}" --non-interactive 2>&1`;
    const output = execSync(cmd, { encoding: "utf-8", timeout: 15000 });
    return { success: true, output };
  } catch (err: unknown) {
    const error = err as { stderr?: string; stdout?: string; message: string };
    return { success: false, error: error.stderr || error.stdout || error.message };
  }
}

/**
 * Adds a routing binding by editing openclaw.json directly.
 * This is how OpenClaw maps WhatsApp groups/DMs to specific agents.
 *
 * Binding format:
 * { "agentId": "...", "match": { "channel": "whatsapp", "peer": { "kind": "group"|"dm", "id": "..." } } }
 */
export function addRoutingBinding(
  agentId: string,
  peerKind: "group" | "dm",
  peerId: string
): { success: boolean; error?: string } {
  try {
    const configRaw = fs.readFileSync(OPENCLAW_CONFIG, "utf-8");
    const config = JSON.parse(configRaw);

    if (!config.bindings) {
      config.bindings = [];
    }

    // Check if binding already exists
    const exists = config.bindings.some(
      (b: { agentId: string; match: { peer: { id: string } } }) =>
        b.agentId === agentId && b.match?.peer?.id === peerId
    );

    if (!exists) {
      config.bindings.push({
        agentId,
        match: {
          channel: "whatsapp",
          peer: { kind: peerKind, id: peerId },
        },
      });

      fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), "utf-8");
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Adds the agent's phone to groupAllowFrom and configures DM allowlist.
 * This ensures only the agent owner's messages are processed (safety).
 */
export function configureSafeguards(
  ownerPhone: string
): { success: boolean; error?: string } {
  try {
    const configRaw = fs.readFileSync(OPENCLAW_CONFIG, "utf-8");
    const config = JSON.parse(configRaw);
    const channels = config.channels?.whatsapp || {};

    // Ensure groupAllowFrom exists and includes owner
    if (!channels.groupAllowFrom) channels.groupAllowFrom = [];
    if (!channels.groupAllowFrom.includes(ownerPhone)) {
      channels.groupAllowFrom.push(ownerPhone);
    }

    // Ensure allowFrom (DM) exists and includes owner
    if (!channels.allowFrom) channels.allowFrom = [];
    if (!channels.allowFrom.includes(ownerPhone)) {
      channels.allowFrom.push(ownerPhone);
    }

    if (!config.channels) config.channels = {};
    config.channels.whatsapp = channels;

    fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), "utf-8");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
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
 * Provisions a complete agent: workspace + registration + optional routing + safeguards
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

  // 2. Register with OpenClaw CLI
  const reg = registerAgent(config.agentId, workspacePath, config.name);
  if (!reg.success) {
    return { success: false, error: `Registration failed: ${reg.error}` };
  }

  // 3. Add routing binding if group specified
  if (config.groupId) {
    const route = addRoutingBinding(config.agentId, "group", config.groupId);
    if (!route.success) {
      return { success: false, workspacePath, error: `Routing failed: ${route.error}` };
    }
  }

  // 4. Configure safeguards if phone provided (DM allowlist + group allowlist)
  if (config.dmPhone) {
    const safeguard = configureSafeguards(config.dmPhone);
    if (!safeguard.success) {
      return { success: false, workspacePath, error: `Safeguards failed: ${safeguard.error}` };
    }
  }

  return { success: true, workspacePath };
}
