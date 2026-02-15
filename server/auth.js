import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "campus-connect-secret-change-in-production";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function login(email, password) {
  const { rows } = await query(
    `SELECT p.*, u.encrypted_password
     FROM profiles p
     JOIN auth.users u ON u.id = p.id
     WHERE LOWER(p.email) = LOWER($1) LIMIT 1`,
    [email]
  );
  const row = rows[0];
  if (!row) return null;
  const valid = row.encrypted_password && (await bcrypt.compare(password, row.encrypted_password));
  if (!valid) return null;
  const { encrypted_password, ...profile } = row;
  const { rows: roleRows } = await query(
    "SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1",
    [profile.id]
  );
  const role = roleRows[0]?.role || "student";
  return { id: profile.id, email: profile.email, full_name: profile.full_name, role, profile };
}

export async function signup(email, password, fullName) {
  const { rows: existing } = await query("SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)", [email]);
  if (existing.length) return { error: "Email already registered" };
  const hash = await bcrypt.hash(password, 10);
  const { rows: ins } = await query(
    `INSERT INTO auth.users (id, email, encrypted_password)
     VALUES (gen_random_uuid(), $1, $2)
     RETURNING id`,
    [email, hash]
  );
  const id = ins[0].id;
  await query(
    "INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
    [id, email, fullName || email]
  );
  await query(
    "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())",
    [id, "student"]
  );
  return { id, email, full_name: fullName || email };
}
