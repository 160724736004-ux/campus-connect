# Campus Connect – PostgreSQL API Server

Standalone Express backend using PostgreSQL instead of Supabase.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Create database

```bash
createdb campus_connect
```

### 2. Run migrations

Run migrations in order (supabase migrations first, then server auth init):

```bash
# From project root
psql -d campus_connect -f supabase/migrations/20260214071758_24c63d94-3909-4fbf-b216-754a85753e89.sql
# ... run all other migrations in supabase/migrations/ in order
psql -d campus_connect -f server/migrations/00000_standalone_auth.sql
```

Or use the Supabase CLI to push migrations (without starting Supabase):

```bash
supabase db push
```

Then run the standalone auth migration for auth.users:

```bash
psql -d campus_connect -f server/migrations/00000_standalone_auth.sql
```

### 3. Create admin user

```bash
cd server
node -e "
const bcrypt = require('bcryptjs');
const { query } = require('./db.js');
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await query(\`INSERT INTO auth.users (id, email, encrypted_password) 
    VALUES (gen_random_uuid(), 'admin@campus.local', \$1) RETURNING id\`, [hash]);
  const { rows } = await query('SELECT id FROM auth.users WHERE email = \$1', ['admin@campus.local']);
  const id = rows[0].id;
  await query('INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES (\$1, \$2, \$3, NOW(), NOW()) ON CONFLICT DO NOTHING', [id, 'admin@campus.local', 'Admin']);
  await query('INSERT INTO user_roles (id, user_id, role, created_at) VALUES (gen_random_uuid(), \$1, \$2, NOW()) ON CONFLICT DO NOTHING', [id, 'admin']);
  console.log('Admin created: admin@campus.local / admin123');
})();
"
```

### 4. Install and start server

```bash
cd server
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/campus_connect node index.js
```

### 5. Frontend configuration

In `.env.local`:

```
VITE_USE_POSTGRES_API=true
VITE_API_URL=http://localhost:3001
```

Unset `VITE_USE_OFFLINE_DB` or set it to false.

## Environment variables

| Variable        | Default                                        | Description              |
|----------------|------------------------------------------------|---------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/campus_connect` | PostgreSQL connection URL |
| `PORT`         | 3001                                           | API server port           |
| `JWT_SECRET`   | (dev default)                                  | JWT signing secret        |
| `CORS_ORIGIN`  | http://localhost:8080                          | Frontend origin           |
| `UPLOAD_DIR`   | ./uploads                                      | File upload directory     |

## API

- `POST /auth/v1/token` – Login (body: `{ email, password }`)
- `POST /auth/v1/signup` – Signup
- `GET /auth/v1/user` – Current user (Bearer token)
- `GET /rest/v1/:table` – Select (query: `column.eq=value`, `order=col.desc`, `limit`, etc.)
- `POST /rest/v1/:table` – Insert
- `PATCH /rest/v1/:table` – Update (query: filters)
- `POST /rest/v1/rpc/:fn` – RPC calls
