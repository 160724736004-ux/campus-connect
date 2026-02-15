import bcrypt from "bcryptjs";
import { query } from "./db.js";

async function seedAdmin() {
  const email = "admin@campus.local";
  const password = "admin123";
  const hash = await bcrypt.hash(password, 10);

  const { rows: existing } = await query("SELECT id FROM auth.users WHERE email = $1", [email]);
  if (existing.length) {
    console.log("Admin already exists:", email);
    return;
  }

  const { rows: ins } = await query(
    "INSERT INTO auth.users (id, email, encrypted_password) VALUES (gen_random_uuid(), $1, $2) RETURNING id",
    [email, hash]
  );
  const id = ins[0].id;

  await query(
    "INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
    [id, email, "Admin User"]
  );
  await query(
    "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())",
    [id, "admin"]
  );

  console.log("Admin created:", email, "/", password);
}

seedAdmin().catch(console.error).finally(() => process.exit(0));
