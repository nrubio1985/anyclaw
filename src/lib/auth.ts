import jwt from "jsonwebtoken";
import { getDb, User } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const JWT_SECRET = process.env.JWT_SECRET || "anyclaw-dev-secret-change-me";
const TOKEN_EXPIRY = "30d";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createOrGetUser(phone: string, name?: string): User {
  const db = getDb();
  const normalized = phone.replace(/\D/g, "");

  const existing = db.prepare("SELECT * FROM users WHERE phone = ?").get(normalized) as User | undefined;
  if (existing) {
    db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(existing.id);
    return existing;
  }

  const id = nanoid(12);
  db.prepare("INSERT INTO users (id, phone, name) VALUES (?, ?, ?)").run(
    id,
    normalized,
    name || "User"
  );
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User;
}

export function createToken(user: User): string {
  return jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): { userId: string; phone: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; phone: string };
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string): User | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) as User | null;
}

// OTP store (in-memory for MVP, move to Redis later)
const otpStore = new Map<string, { otp: string; expires: number }>();

export function storeOTP(phone: string, otp: string) {
  const normalized = phone.replace(/\D/g, "");
  otpStore.set(normalized, {
    otp,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

export function verifyOTP(phone: string, otp: string): boolean {
  const normalized = phone.replace(/\D/g, "");
  const stored = otpStore.get(normalized);
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    otpStore.delete(normalized);
    return false;
  }
  if (stored.otp !== otp) return false;
  otpStore.delete(normalized);
  return true;
}
