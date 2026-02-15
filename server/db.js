import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/campus_connect",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text, params, options = {}) {
  const client = await pool.connect();
  try {
    if (options.userId) {
      await client.query("SET LOCAL app.current_user_id = $1", [options.userId]);
    }
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export { pool };
