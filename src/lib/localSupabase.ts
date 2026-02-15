/**
 * Local Supabase adapter - mimics Supabase client API using IndexedDB.
 * Use when VITE_USE_OFFLINE_DB=true or Supabase is unreachable.
 */
import { localDb, getTable, type LocalRecord } from "./localDb";

const LOCAL_AUTH_KEY = "campus_connect_local_auth";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function matches(row: LocalRecord, filters: { col: string; op: string; val: unknown }[]): boolean {
  for (const f of filters) {
    const v = (row as any)[f.col];
    if (f.op === "eq" && v !== f.val) return false;
    if (f.op === "neq" && v === f.val) return false;
    if (f.op === "in" && !(Array.isArray(f.val) && f.val.includes(v))) return false;
    if (f.op === "is" && v !== null && v !== undefined) return false;
    if (f.op === "gte" && (v == null || String(v) < String(f.val))) return false;
    if (f.op === "lte" && (v == null || String(v) > String(f.val))) return false;
    if (f.op === "or") {
      const expr = f.val as string;
      const parts = expr.split(",").map((p) => p.trim());
      const ok = parts.some((p) => {
        const m = p.match(/(\w+)\.eq\.([^,]+)/);
        if (!m) return false;
        const [, col, val] = m;
        return (row as any)[col] === val;
      });
      if (!ok) return false;
    }
  }
  return true;
}

type QueryChain = {
  select: (columns?: string) => QueryChain;
  eq: (col: string, val: unknown) => QueryChain;
  neq: (col: string, val: unknown) => QueryChain;
  in: (col: string, vals: unknown[]) => QueryChain;
  is: (col: string, val: null) => QueryChain;
  gte: (col: string, val: unknown) => QueryChain;
  lte: (col: string, val: unknown) => QueryChain;
  or: (expr: string) => QueryChain;
  order: (col: string, opts?: { ascending?: boolean }) => QueryChain;
  limit: (n: number) => QueryChain;
  single: () => QueryChain;
  maybeSingle: () => QueryChain;
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => { select: () => QueryChain; then: (onfulfilled: (r: any) => any, onrejected?: (e: any) => any) => Promise<any> };
  update: (data: Record<string, unknown>) => QueryChain;
  upsert: (data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) => { then: (onfulfilled: (r: any) => any, onrejected?: (e: any) => any) => Promise<any> };
  then: (onfulfilled: (res: { data: unknown; error: Error | null }) => unknown, onrejected?: (err: unknown) => unknown) => Promise<unknown>;
};

function createChain(tableName: string): QueryChain {
  const state = {
    _table: tableName,
    _filters: [] as { col: string; op: string; val: unknown }[],
    _order: undefined as { col: string; ascending: boolean } | undefined,
    _limit: undefined as number | undefined,
    _single: false,
    _mode: "select" as "select" | "insert" | "update" | "upsert",
    _insertData: undefined as Record<string, unknown> | Record<string, unknown>[] | undefined,
    _updateData: undefined as Record<string, unknown> | undefined,
    _upsertData: undefined as Record<string, unknown> | Record<string, unknown>[] | undefined,
    _upsertOpts: undefined as { onConflict?: string } | undefined,
  };

  const runSelect = () => {
    const tbl = getTable(state._table);
    if (!tbl) return Promise.resolve({ data: null, error: new Error("Table not found: " + state._table) });
    return tbl.toArray().then((rows) => {
      let result = rows.filter((r) => matches(r, state._filters));
      if (state._order) {
        result = result.sort((a, b) => {
          const av = (a as any)[state._order!.col];
          const bv = (b as any)[state._order!.col];
          const cmp = av == null && bv == null ? 0 : String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
          return state._order!.ascending ? cmp : -cmp;
        });
      }
      if (state._limit) result = result.slice(0, state._limit);
      if (state._single) {
        if (result.length > 1) return { data: null, error: new Error("Multiple rows") };
        return { data: result[0] ?? null, error: null };
      }
      return { data: result, error: null };
    });
  };

  const chain: QueryChain = {
    select: () => { state._mode = "select"; return chain; },
    eq: (col, val) => { state._filters.push({ col, op: "eq", val }); return chain; },
    neq: (col, val) => { state._filters.push({ col, op: "neq", val }); return chain; },
    in: (col, vals) => { state._filters.push({ col, op: "in", val: vals }); return chain; },
    is: (col, val) => { state._filters.push({ col, op: "is", val }); return chain; },
    gte: (col, val) => { state._filters.push({ col, op: "gte", val }); return chain; },
    lte: (col, val) => { state._filters.push({ col, op: "lte", val }); return chain; },
    or: (expr) => { state._filters.push({ col: "", op: "or", val: expr }); return chain; },
    order: (col, opts) => { state._order = { col, ascending: opts?.ascending !== false }; return chain; },
    limit: (n) => { state._limit = n; return chain; },
    single: () => { state._single = true; return chain; },
    maybeSingle: () => { state._single = true; return chain; },
    insert: (data) => {
      state._mode = "insert"; state._insertData = data;
      return {
        select: () => chain,
        then: async (onfulfilled, onrejected) => {
          try {
            const tbl = getTable(state._table);
            if (!tbl) return onfulfilled?.({ data: null, error: new Error("Table not found") });
            const arr = Array.isArray(state._insertData) ? state._insertData : [state._insertData!];
            const rows = arr.map((r) => ({ ...r, id: (r as any).id || uuid() }));
            await tbl.bulkAdd(rows);
            return onfulfilled?.({ data: rows.length === 1 ? rows[0] : rows, error: null });
          } catch (e) {
            return onrejected ? onrejected(e) : onfulfilled?.({ data: null, error: e });
          }
        },
      };
    },
    update: (data) => {
      state._mode = "update"; state._updateData = data;
      return chain;
    },
    upsert: (data, opts) => {
      state._mode = "upsert"; state._upsertData = data; state._upsertOpts = opts;
      return {
        then: async (onfulfilled, onrejected) => {
          try {
            const tbl = getTable(state._table);
            if (!tbl) return onfulfilled?.({ data: null, error: new Error("Table not found") });
            const row = (Array.isArray(state._upsertData) ? state._upsertData[0] : state._upsertData) as any;
            if (!row) return onfulfilled?.({ data: null, error: null });
            const conflictCols = (state._upsertOpts?.onConflict || "").split(",").map((c) => c.trim()).filter(Boolean);
            const all = await tbl.toArray();
      const existing = conflictCols.length ? all.find((r: any) => conflictCols.every((c) => (r as any)[c] === row[c])) : null;
            if (existing) {
              await tbl.update((existing as any).id, { ...row, id: (existing as any).id });
              return onfulfilled?.({ data: { ...existing, ...row }, error: null });
            }
            const newRow = { ...row, id: row.id || uuid() };
            await tbl.add(newRow);
            return onfulfilled?.({ data: newRow, error: null });
          } catch (e) {
            return onrejected ? onrejected(e) : onfulfilled?.({ data: null, error: e });
          }
        },
      };
    },
    then: (onfulfilled, onrejected) => {
      if (state._mode === "update" && state._updateData) {
        const tbl = getTable(state._table);
        if (!tbl) return Promise.resolve(onfulfilled?.({ data: null, error: new Error("Table not found") })).catch(onrejected);
        return tbl.toArray().then((rows) => {
          const matching = rows.filter((r) => matches(r, state._filters));
          return Promise.all(matching.map((r) => tbl.update((r as any).id, { ...r, ...state._updateData })));
        }).then(() => onfulfilled?.({ data: null, error: null })).catch((e) => onrejected ? onrejected(e) : onfulfilled?.({ data: null, error: e }));
      }
      return runSelect().then((r) => onfulfilled?.(r)).catch((e) => onrejected ? onrejected(e) : onfulfilled?.({ data: null, error: e }));
    },
  };
  return chain;
}

export const localSupabase = {
  from: (tableName: string) => createChain(tableName),

  auth: {
    getSession: async () => {
      try {
        const raw = localStorage.getItem(LOCAL_AUTH_KEY);
        const data = raw ? JSON.parse(raw) : null;
        return { data: { session: data?.session ?? null }, error: null };
      } catch (e) {
        return { data: { session: null }, error: e };
      }
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const profiles = getTable("profiles");
      if (!profiles) return { data: { user: null, session: null }, error: new Error("Offline DB not ready") };
      const all = await profiles.toArray();
      let profile = all.find((p: any) => (p.email || "").toLowerCase() === email.toLowerCase());
      if (!profile) {
        profile = all[0];
        if (!profile) {
          const defaultUser = {
            id: uuid(),
            email: "admin@campus.local",
            full_name: "Admin (Offline)",
            role: "admin",
          };
          await profiles.add({ ...defaultUser, id: defaultUser.id });
          const roles = getTable("user_roles");
          if (roles) await roles.add({ id: uuid(), user_id: defaultUser.id, role: "admin" });
          profile = defaultUser;
        }
      }
      const user = { id: profile.id, email: profile.email || email };
      const session = { user, access_token: "local", expires_at: Date.now() + 86400000 };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ session }));
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(LOCAL_AUTH_KEY);
      return { error: null };
    },
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      const raw = localStorage.getItem(LOCAL_AUTH_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data?.session) cb("INITIAL_SESSION", data.session);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  rpc: async (fnName: string, params: Record<string, unknown>) => {
    if (fnName === "record_payment") {
      const invId = params.p_invoice_id as string;
      const amt = params.p_amount as number;
      const receipts = getTable("payment_receipts");
      const payments = getTable("payments");
      const invoices = getTable("invoices");
      if (!payments || !invoices) return { data: null, error: new Error("Tables not found") };
      const invs = await invoices.toArray();
      const inv = invs.find((i: any) => i.id === invId);
      if (!inv) return { data: null, error: new Error("Invoice not found") };
      const payId = uuid();
      await payments.add({ id: payId, invoice_id: invId, amount: amt, paid_at: new Date().toISOString() });
      const paid = ((inv as any).paid_amount || 0) + amt;
      await invoices.where("id").equals(invId).modify({ paid_amount: paid, status: paid >= (inv as any).total_amount ? "paid" : "partial" });
      if (receipts) await receipts.add({ id: uuid(), invoice_id: invId, amount: amt });
      return { data: payId, error: null };
    }
    if (fnName === "assign_fee_to_student" || fnName === "start_online_test_attempt") {
      return { data: uuid(), error: null };
    }
    return { data: null, error: null };
  },

  storage: {
    from: () => ({
      upload: async (path: string, file: File) => {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => {
            try {
              const b64 = (reader.result as string).split(",")[1] || "";
              localStorage.setItem("lms_file_" + path.replace(/\//g, "_"), b64);
              resolve({ error: null });
            } catch { resolve({ error: new Error("Upload failed") }); }
          };
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: (path: string) => {
        const key = "lms_file_" + path.replace(/\//g, "_");
        const b64 = localStorage.getItem(key);
        const url = b64 ? "data:application/octet-stream;base64," + b64 : "";
        return { data: { publicUrl: url } };
      },
    }),
  },
};
