/**
 * PostgreSQL API client - replaces Supabase when using standalone backend.
 * Mimics Supabase client API for drop-in compatibility.
 */

// Empty = use relative URLs (Vite proxy to backend). Or set full URL e.g. http://localhost:3001
const API_URL = import.meta.env.VITE_API_URL ?? "";

let _accessToken: string | null = localStorage.getItem("sb-access-token");

export function setAccessToken(token: string | null) {
  _accessToken = token;
  if (token) localStorage.setItem("sb-access-token", token);
  else localStorage.removeItem("sb-access-token");
}

export function getAccessToken() {
  return _accessToken;
}

async function fetchApi(
  path: string,
  opts: RequestInit & { params?: Record<string, string> } = {}
) {
  const { params, ...rest } = opts;
  const url = new URL(API_URL + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Apikey: "campus-connect",
    ...((rest.headers as Record<string, string>) || {}),
  };
  if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;
  const res = await fetch(url.toString(), { ...rest, headers });
  if (res.status === 401) setAccessToken(null);
  return res;
}

function buildQuery(opts: {
  select?: string;
  filters?: Array<{ col: string; op: string; val: unknown }>;
  order?: { col: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
}) {
  const params: Record<string, string> = {};
  if (opts.select) params.select = opts.select;
  if (opts.order) params.order = `${opts.order.col}.${opts.order.ascending ? "asc" : "desc"}`;
  if (opts.limit) params.limit = String(opts.limit);
  if (opts.filters) {
    for (const f of opts.filters) {
      if (f.op === "eq") params[`${f.col}.eq`] = String(f.val);
      else if (f.op === "neq") params[`${f.col}.neq`] = String(f.val);
      else if (f.op === "in") params[`${f.col}.in`] = Array.isArray(f.val) ? f.val.join(",") : String(f.val);
      else if (f.op === "is") params[`${f.col}.is`] = "null";
      else if (f.op === "gte") params[`${f.col}.gte`] = String(f.val);
      else if (f.op === "lte") params[`${f.col}.lte`] = String(f.val);
    }
  }
  if (opts.single) params.limit = "1";
  return params;
}

function createChain(table: string) {
  const state: {
    select?: string;
    filters: Array<{ col: string; op: string; val: unknown }>;
    orFilters?: Array<{ col: string; val: unknown }>;
    order?: { col: string; ascending: boolean };
    limit?: number;
    single?: boolean;
    insertData?: Record<string, unknown> | Record<string, unknown>[];
    updateData?: Record<string, unknown>;
    upsertData?: Record<string, unknown> | Record<string, unknown>[];
    upsertOpts?: { onConflict?: string };
  } = { filters: [] };

  const toQueryParams = () => {
    const params: Record<string, string> = {};
    if (state.select) params.select = state.select;
    if (state.order) params.order = `${state.order.col}.${state.order.ascending ? "asc" : "desc"}`;
    if (state.limit) params.limit = String(state.limit);
    for (const f of state.filters) {
      if (f.op === "eq") params[`${f.col}.eq`] = String(f.val);
      else if (f.op === "neq") params[`${f.col}.neq`] = String(f.val);
      else if (f.op === "in") params[`${f.col}.in`] = Array.isArray(f.val) ? f.val.join(",") : String(f.val);
      else if (f.op === "is") params[`${f.col}.is`] = "null";
      else if (f.op === "gte") params[`${f.col}.gte`] = String(f.val);
      else if (f.op === "lte") params[`${f.col}.lte`] = String(f.val);
    }
    if (state.orFilters?.length)
      params.or = state.orFilters.map((f) => `${f.col}.eq.${f.val}`).join(",");
    if (state.single) params.limit = "1";
    return params;
  };

  const chain: any = {
    select: (cols?: string) => {
      state.select = cols || "*";
      return chain;
    },
    eq: (col: string, val: unknown) => {
      state.filters.push({ col, op: "eq", val });
      return chain;
    },
    neq: (col: string, val: unknown) => {
      state.filters.push({ col, op: "neq", val });
      return chain;
    },
    in: (col: string, vals: unknown[]) => {
      state.filters.push({ col, op: "in", val: vals });
      return chain;
    },
    is: (col: string, val: null) => {
      state.filters.push({ col, op: "is", val });
      return chain;
    },
    gte: (col: string, val: unknown) => {
      state.filters.push({ col, op: "gte", val });
      return chain;
    },
    lte: (col: string, val: unknown) => {
      state.filters.push({ col, op: "lte", val });
      return chain;
    },
    or: (expr: string) => {
      state.orFilters = [];
      const parts = expr.split(",").map((p) => p.trim());
      for (const p of parts) {
        const m = p.match(/(\w+)\.eq\.([^,]+)/);
        if (m) state.orFilters.push({ col: m[1], val: m[2] });
      }
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      state.order = { col, ascending: opts?.ascending !== false };
      return chain;
    },
    limit: (n: number) => {
      state.limit = n;
      return chain;
    },
    single: () => {
      state.single = true;
      return chain;
    },
    maybeSingle: () => {
      state.single = true;
      return chain;
    },
    insert: (data: Record<string, unknown> | Record<string, unknown>[]) => {
      state.insertData = data;
      return {
        select: () => chain,
        then: async (onFulfilled: (r: { data: unknown; error: Error | null }) => unknown) => {
          const res = await fetchApi(`/rest/v1/${table}`, {
            method: "POST",
            body: JSON.stringify(data),
            headers: { Prefer: "return=representation" },
          });
          const body = await res.json();
          if (!res.ok) return onFulfilled?.({ data: null, error: new Error(body.error || "Insert failed") });
          return onFulfilled?.({ data: Array.isArray(data) ? body : body[0] ?? body, error: null });
        },
      };
    },
    update: (data: Record<string, unknown>) => {
      state.updateData = data;
      return {
        ...chain,
        then: async (onFulfilled: (r: { data: unknown; error: Error | null }) => unknown) => {
          const params = toQueryParams();
          const res = await fetchApi(`/rest/v1/${table}?` + new URLSearchParams(params).toString(), {
            method: "PATCH",
            body: JSON.stringify(data),
          });
          const body = await res.json();
          if (!res.ok) return onFulfilled?.({ data: null, error: new Error(body.error || "Update failed") });
          return onFulfilled?.({ data: body, error: null });
        },
      };
    },
    upsert: (data: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return { then: (cb: any) => cb({ data: null, error: null }) };
      return {
        then: async (onFulfilled: (r: { data: unknown; error: Error | null }) => unknown) => {
          const conflictCols = (opts?.onConflict || "").split(",").map((c) => c.trim()).filter(Boolean);
          if (conflictCols.length) {
            const params: Record<string, string> = {};
            conflictCols.forEach((c) => { params[`${c}.eq`] = String((row as any)[c]); });
            const getRes = await fetchApi(`/rest/v1/${table}?` + new URLSearchParams(params).toString(), { method: "GET" });
            const existing = await getRes.json();
            if (existing?.length) {
              const res = await fetchApi(`/rest/v1/${table}?` + new URLSearchParams(params).toString(), {
                method: "PATCH",
                body: JSON.stringify(row),
              });
              const body = await res.json();
              return onFulfilled?.({ data: Array.isArray(body) ? body[0] : body, error: res.ok ? null : new Error(body.error) });
            }
          }
          const res = await fetchApi(`/rest/v1/${table}`, {
            method: "POST",
            body: JSON.stringify(row),
            headers: { Prefer: "return=representation" },
          });
          const body = await res.json();
          return onFulfilled?.({ data: Array.isArray(body) ? body[0] : body, error: res.ok ? null : new Error(body.error || "Upsert failed") });
        },
      };
    },
    then: async (onFulfilled: (r: { data: unknown; error: Error | null }) => unknown) => {
      const params = toQueryParams();
      const res = await fetchApi(`/rest/v1/${table}?` + new URLSearchParams(params).toString(), { method: "GET" });
      const data = await res.json();
      if (!res.ok) return onFulfilled?.({ data: null, error: new Error(data.error || "Request failed") });
      const out = state.single ? (Array.isArray(data) ? data[0] ?? null : data) : data;
      return onFulfilled?.({ data: out, error: null });
    },
  };
  return chain;
}

const pgApi = {
  from: (table: string) => createChain(table),

  auth: {
    getSession: async () => {
      if (!_accessToken) return { data: { session: null }, error: null };
      const res = await fetchApi("/auth/v1/user");
      if (res.status === 401) {
        setAccessToken(null);
        return { data: { session: null }, error: null };
      }
      const user = await res.json();
      return {
        data: {
          session: {
            user: { id: user.id, email: user.email },
            access_token: _accessToken,
          },
        },
        error: null,
      };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch(API_URL + "/auth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.message || "Login failed" } };
      setAccessToken(data.access_token);
      return {
        data: {
          user: data.user,
          session: { user: data.user, access_token: data.access_token },
        },
        error: null,
      };
    },
    signUp: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string } };
    }) => {
      const res = await fetch(API_URL + "/auth/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          data: options?.data,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.message || "Signup failed" } };
      setAccessToken(data.access_token);
      return { data: { user: data.user, session: { user: data.user, access_token: data.access_token } }, error: null };
    },
    signOut: async () => {
      setAccessToken(null);
      await fetchApi("/auth/v1/logout", { method: "POST" });
      return { error: null };
    },
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      if (_accessToken) {
        fetchApi("/auth/v1/user")
          .then((r) => (r.ok ? r.json() : null))
          .then((user) => {
            if (user) cb("INITIAL_SESSION", { user: { id: user.id, email: user.email }, access_token: _accessToken });
          });
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  rpc: async (fn: string, params: Record<string, unknown>) => {
    const res = await fetchApi(`/rest/v1/rpc/${fn}`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data.error || "RPC failed" } };
    const result = typeof data === "object" && data !== null && Object.keys(data).length === 1
      ? Object.values(data)[0] : data;
    return { data: result, error: null };
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        const form = new FormData();
        form.append("file", file);
        form.append("path", path);
        form.append("bucket", bucket);
        const res = await fetch(API_URL + "/storage/upload", {
          method: "POST",
          headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {},
          body: form,
        });
        const data = await res.json();
        return res.ok ? { error: null } : { error: { message: data.error || "Upload failed" } };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `${API_URL}/storage/${path}` },
      }),
    }),
  },
};

export default pgApi;
