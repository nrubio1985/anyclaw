/**
 * Multi-Gateway Manager
 *
 * Manages per-user OpenClaw gateway instances using --profile isolation.
 * Each user gets their own gateway process with:
 *   - Isolated state dir: ~/.openclaw-<profile>/
 *   - Isolated config: ~/.openclaw-<profile>/openclaw.json
 *   - Own WebSocket port
 *   - Own systemd service
 *
 * CLI patterns:
 *   openclaw --profile <name> configure --section gateway
 *   openclaw --profile <name> gateway run --port <port>
 *   openclaw --profile <name> gateway install --port <port>
 *   openclaw --profile <name> channels login --channel whatsapp
 *   openclaw --profile <name> channels status --json
 *   openclaw --profile <name> agents add <name> --workspace <dir> --model <id> --non-interactive
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const OPENCLAW_BIN = process.env.OPENCLAW_BIN || "openclaw";
const AGENTS_BASE_DIR = process.env.AGENTS_BASE_DIR || "/root/agents/anyclaw";
const MAIN_OPENCLAW_CONFIG = process.env.OPENCLAW_CONFIG || "/root/.openclaw/openclaw.json";
const BASE_PORT = 19100; // Start allocating from port 19100

/**
 * Reads the Anthropic API key from env or the main OpenClaw config.
 * This is used when bootstrapping new gateway profiles.
 */
function getAnthropicApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const raw = fs.readFileSync(MAIN_OPENCLAW_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    return config?.models?.providers?.anthropic?.apiKey || "";
  } catch {
    return "";
  }
}

// --- Types ---

export interface GatewayInfo {
  id: string;
  userId: string;
  profile: string;
  port: number;
  status: string;
  phone: string | null;
  pid: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ExecResult {
  success: boolean;
  output?: string;
  error?: string;
}

// --- Port Allocation ---

/** Find the next available port starting from BASE_PORT */
function allocatePort(): number {
  const db = getDb();
  const maxPort = db
    .prepare("SELECT MAX(port) as max_port FROM gateways")
    .get() as { max_port: number | null };

  return maxPort?.max_port ? maxPort.max_port + 1 : BASE_PORT;
}

// --- Profile CLI Helpers ---

/** Execute an openclaw command with a profile */
function execProfile(profile: string, cmd: string, timeout = 15000): ExecResult {
  try {
    const fullCmd = `${OPENCLAW_BIN} --profile "${profile}" ${cmd} 2>&1`;
    const output = execSync(fullCmd, { encoding: "utf-8", timeout });
    return { success: true, output: output.trim() };
  } catch (err: unknown) {
    const error = err as { stderr?: string; stdout?: string; message: string };
    return {
      success: false,
      error: error.stderr || error.stdout || error.message,
    };
  }
}

/** Get the config path for a profile */
function getProfileConfigPath(profile: string): string {
  return `/root/.openclaw-${profile}/openclaw.json`;
}

/** Get the state dir for a profile */
function getProfileStateDir(profile: string): string {
  return `/root/.openclaw-${profile}`;
}

// --- Gateway Lifecycle ---

/**
 * Creates a new gateway for a user.
 * 1. Allocates a port
 * 2. Creates the profile directory structure
 * 3. Writes a minimal openclaw.json config
 * 4. Records in DB
 */
export function createGateway(userId: string): {
  success: boolean;
  gateway?: GatewayInfo;
  error?: string;
} {
  const db = getDb();

  // Check if user already has a gateway
  const existing = db
    .prepare("SELECT * FROM gateways WHERE user_id = ?")
    .get(userId) as GatewayInfo | undefined;

  if (existing) {
    return { success: true, gateway: existing };
  }

  const gatewayId = nanoid(12);
  const profile = `anyclaw-${gatewayId}`;
  const port = allocatePort();

  try {
    // Create state directory
    const stateDir = getProfileStateDir(profile);
    fs.mkdirSync(stateDir, { recursive: true });

    // Write minimal config for the profile
    const config = {
      meta: {
        lastTouchedVersion: "2026.2.14",
        lastTouchedAt: new Date().toISOString(),
      },
      models: {
        providers: {
          anthropic: {
            baseUrl: "https://api.anthropic.com",
            apiKey: getAnthropicApiKey(),
            models: [
              {
                id: process.env.OPENCLAW_MODEL || "anthropic/claude-sonnet-4-20250514",
                name: "Claude Sonnet",
                isDefault: true,
              },
            ],
          },
        },
      },
      gateway: {
        mode: "local",
        bind: "loopback",
        port: port,
      },
      channels: {
        whatsapp: {
          enabled: true,
          dmPolicy: "allowlist",
          groupPolicy: "allowlist",
          allowFrom: [],
          groupAllowFrom: [],
          ackEmoji: "👀",
        },
      },
      agents: [],
      bindings: [],
    };

    const configPath = getProfileConfigPath(profile);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Record in DB
    db.prepare(`
      INSERT INTO gateways (id, user_id, profile, port, status)
      VALUES (?, ?, ?, ?, 'created')
    `).run(gatewayId, userId, profile, port);

    const gateway = db
      .prepare("SELECT * FROM gateways WHERE id = ?")
      .get(gatewayId) as GatewayInfo;

    return { success: true, gateway };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Installs the gateway as a systemd service and starts it.
 * The service will run: openclaw --profile <name> gateway --port <port>
 */
export function installAndStartGateway(gatewayId: string): ExecResult {
  const db = getDb();
  const gw = db
    .prepare("SELECT * FROM gateways WHERE id = ?")
    .get(gatewayId) as GatewayInfo | undefined;

  if (!gw) return { success: false, error: "Gateway not found" };

  try {
    // Create systemd service file directly (more control than `gateway install`)
    const serviceName = `openclaw-${gw.profile}`;
    const serviceContent = `[Unit]
Description=OpenClaw Gateway (${gw.profile})
After=network.target

[Service]
Type=simple
User=root
Environment=NODE_OPTIONS=--max-old-space-size=384
Environment=PUPPETEER_EXECUTABLE_PATH=/snap/bin/chromium
Environment=CHROME_PATH=/snap/bin/chromium
ExecStart=${OPENCLAW_BIN} --profile "${gw.profile}" gateway --port ${gw.port}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

    fs.writeFileSync(
      `/etc/systemd/system/${serviceName}.service`,
      serviceContent,
      "utf-8"
    );

    // Reload systemd and start
    execSync("systemctl daemon-reload", { encoding: "utf-8", timeout: 10000 });
    execSync(`systemctl enable ${serviceName}`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    execSync(`systemctl start ${serviceName}`, {
      encoding: "utf-8",
      timeout: 10000,
    });

    // Update DB
    db.prepare(
      "UPDATE gateways SET status = 'starting', updated_at = datetime('now') WHERE id = ?"
    ).run(gatewayId);

    // Wait a moment then check if it started
    execSync("sleep 3", { timeout: 10000 });

    const statusOutput = execSync(
      `systemctl is-active ${serviceName} 2>&1`,
      { encoding: "utf-8", timeout: 5000 }
    ).trim();

    if (statusOutput === "active") {
      db.prepare(
        "UPDATE gateways SET status = 'pairing', updated_at = datetime('now') WHERE id = ?"
      ).run(gatewayId);
      return { success: true, output: "Gateway started, ready for WhatsApp pairing" };
    } else {
      db.prepare(
        "UPDATE gateways SET status = 'error', updated_at = datetime('now') WHERE id = ?"
      ).run(gatewayId);
      return {
        success: false,
        error: `Service status: ${statusOutput}`,
      };
    }
  } catch (err: unknown) {
    db.prepare(
      "UPDATE gateways SET status = 'error', updated_at = datetime('now') WHERE id = ?"
    ).run(gatewayId);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Gets the WhatsApp QR code for a gateway that's in pairing mode.
 * Reads from the gateway's channel state.
 */
export function getQrCode(gatewayId: string): {
  success: boolean;
  qr?: string;
  status?: string;
  error?: string;
} {
  const db = getDb();
  const gw = db
    .prepare("SELECT * FROM gateways WHERE id = ?")
    .get(gatewayId) as GatewayInfo | undefined;

  if (!gw) return { success: false, error: "Gateway not found" };

  try {
    // Try to get channel status which includes QR if available
    const result = execProfile(gw.profile, "channels status --json", 10000);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const status = JSON.parse(result.output || "{}");
    const whatsapp = status?.channels?.whatsapp || status?.whatsapp;

    if (whatsapp?.qr) {
      return { success: true, qr: whatsapp.qr, status: "qr_ready" };
    }

    if (whatsapp?.connected || whatsapp?.state === "connected") {
      // Update DB if connected
      const phone = whatsapp?.phone || whatsapp?.me?.id || null;
      db.prepare(
        "UPDATE gateways SET status = 'connected', phone = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(phone, gatewayId);
      return { success: true, status: "connected" };
    }

    return {
      success: true,
      status: whatsapp?.state || "waiting",
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Gets the status of a gateway
 */
export function getGatewayStatus(gatewayId: string): {
  success: boolean;
  status?: string;
  phone?: string | null;
  serviceActive?: boolean;
  error?: string;
} {
  const db = getDb();
  const gw = db
    .prepare("SELECT * FROM gateways WHERE id = ?")
    .get(gatewayId) as GatewayInfo | undefined;

  if (!gw) return { success: false, error: "Gateway not found" };

  try {
    const serviceName = `openclaw-${gw.profile}`;
    let serviceActive = false;

    try {
      const status = execSync(`systemctl is-active ${serviceName} 2>&1`, {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      serviceActive = status === "active";
    } catch {
      serviceActive = false;
    }

    // If service is active, try to get channel status
    if (serviceActive && gw.status !== "connected") {
      try {
        const result = execProfile(gw.profile, "channels status --json", 10000);
        if (result.success) {
          const statusData = JSON.parse(result.output || "{}");
          const whatsapp = statusData?.channels?.whatsapp || statusData?.whatsapp;

          if (whatsapp?.connected || whatsapp?.state === "connected") {
            const phone = whatsapp?.phone || whatsapp?.me?.id || null;
            db.prepare(
              "UPDATE gateways SET status = 'connected', phone = ?, updated_at = datetime('now') WHERE id = ?"
            ).run(phone, gatewayId);
            return { success: true, status: "connected", phone, serviceActive };
          }
        }
      } catch {
        // Channel status check failed, that's ok
      }
    }

    return {
      success: true,
      status: gw.status,
      phone: gw.phone,
      serviceActive,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Stops and removes a gateway
 */
export function removeGateway(gatewayId: string): ExecResult {
  const db = getDb();
  const gw = db
    .prepare("SELECT * FROM gateways WHERE id = ?")
    .get(gatewayId) as GatewayInfo | undefined;

  if (!gw) return { success: false, error: "Gateway not found" };

  try {
    const serviceName = `openclaw-${gw.profile}`;

    // Stop and disable service
    try {
      execSync(`systemctl stop ${serviceName} 2>&1`, {
        encoding: "utf-8",
        timeout: 10000,
      });
      execSync(`systemctl disable ${serviceName} 2>&1`, {
        encoding: "utf-8",
        timeout: 10000,
      });
    } catch {
      // Service might not exist, that's ok
    }

    // Remove service file
    const serviceFile = `/etc/systemd/system/${serviceName}.service`;
    if (fs.existsSync(serviceFile)) {
      fs.unlinkSync(serviceFile);
      execSync("systemctl daemon-reload", { encoding: "utf-8", timeout: 10000 });
    }

    // Remove profile state dir
    const stateDir = getProfileStateDir(gw.profile);
    if (fs.existsSync(stateDir)) {
      fs.rmSync(stateDir, { recursive: true, force: true });
    }

    // Remove from DB
    db.prepare("DELETE FROM gateways WHERE id = ?").run(gatewayId);

    return { success: true, output: "Gateway removed" };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Registers an agent within a user's gateway profile
 */
export function registerAgentInGateway(
  gatewayId: string,
  agentId: string,
  workspacePath: string,
  ownerPhone: string
): ExecResult {
  const db = getDb();
  const gw = db
    .prepare("SELECT * FROM gateways WHERE id = ?")
    .get(gatewayId) as GatewayInfo | undefined;

  if (!gw) return { success: false, error: "Gateway not found" };

  try {
    const model = process.env.OPENCLAW_MODEL || "anthropic/claude-sonnet-4-20250514";

    // Register agent with OpenClaw CLI (using profile)
    const regResult = execProfile(
      gw.profile,
      `agents add "${agentId}" --workspace "${workspacePath}" --model "${model}" --non-interactive`,
      15000
    );

    if (!regResult.success) {
      return { success: false, error: `Agent registration failed: ${regResult.error}` };
    }

    // Add DM binding in the profile's config
    const configPath = getProfileConfigPath(gw.profile);
    const configRaw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configRaw);

    // Add binding for DM from owner
    if (!config.bindings) config.bindings = [];

    const bindingExists = config.bindings.some(
      (b: { agentId: string }) => b.agentId === agentId
    );

    if (!bindingExists) {
      config.bindings.push({
        agentId,
        match: {
          channel: "whatsapp",
          peer: { kind: "dm", id: ownerPhone },
        },
      });
    }

    // Add owner to allowlists
    const channels = config.channels?.whatsapp || {};
    if (!channels.allowFrom) channels.allowFrom = [];
    if (!channels.allowFrom.includes(ownerPhone)) {
      channels.allowFrom.push(ownerPhone);
    }
    if (!channels.groupAllowFrom) channels.groupAllowFrom = [];
    if (!channels.groupAllowFrom.includes(ownerPhone)) {
      channels.groupAllowFrom.push(ownerPhone);
    }

    if (!config.channels) config.channels = {};
    config.channels.whatsapp = channels;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    return { success: true, output: "Agent registered in gateway" };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Gets a user's gateway, creating one if needed
 */
export function getOrCreateGateway(userId: string): {
  success: boolean;
  gateway?: GatewayInfo;
  error?: string;
} {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM gateways WHERE user_id = ?")
    .get(userId) as GatewayInfo | undefined;

  if (existing) {
    return { success: true, gateway: existing };
  }

  return createGateway(userId);
}

/**
 * Gets the gateway for a user
 */
export function getUserGateway(userId: string): GatewayInfo | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM gateways WHERE user_id = ?")
      .get(userId) as GatewayInfo | null) || null
  );
}
