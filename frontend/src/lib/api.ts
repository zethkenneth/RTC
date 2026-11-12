import type { ListResponse } from "./types";

// Same-origin: next.config.ts forwards /api/* to the backend.
const BASE_URL = "/api";

export type Resource = "employees" | "branches" | "positions";

export interface AuthUser {
  id: string;
  email: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection.");
  }

  // Session expired or missing on a protected call: go to the login page.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    // Full page load on purpose: it also discards pages Next.js keeps alive in the
    // background, so no data from the expired session lingers.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500 && !body?.error) {
      throw new ApiError(res.status, "Cannot reach the API. Is the backend running?");
    }
    // Validation errors come back as { details: { field: [messages] } }
    const details = body?.details;
    const fieldErrors =
      details && typeof details === "object" && !Array.isArray(details) ? details : undefined;
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, fieldErrors);
  }
  return body as T;
}

export type ListParams = Record<string, string | number | undefined>;

const post = (data?: unknown): RequestInit => ({
  method: "POST",
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  list<T>(resource: Resource, params: ListParams = {}) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    return request<ListResponse<T>>(`/${resource}?${qs}`);
  },
  create<T>(resource: Resource, data: unknown) {
    return request<{ data: T }>(`/${resource}`, post(data));
  },
  update<T>(resource: Resource, id: number, data: unknown) {
    return request<{ data: T }>(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  remove(resource: Resource, id: number) {
    return request<void>(`/${resource}/${id}`, { method: "DELETE" });
  },
};

export interface PayrollReportInput {
  year: number;
  quarter: 1 | 2 | 3 | 4; // 3 = July to September
  treasurer: string;
  checked_by_name: string;
  checked_by_title: string;
  noted_by_name: string;
  noted_by_title: string;
  noted_by_line?: string;
  branch_ids?: number[];
  rows_per_page?: number;
}

/** Generates the payroll .docx on the server and starts a browser download. */
export async function downloadPayrollReport(input: PayrollReportInput) {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/reports/payroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection.");
  }
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const details = body?.details;
    throw new ApiError(
      res.status,
      body?.error ?? `Could not generate the report (${res.status})`,
      details && typeof details === "object" && !Array.isArray(details) ? details : undefined,
    );
  }

  const blob = await res.blob();
  const match = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "Pasig City Payroll.docx";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ data: AuthUser }>("/auth/login", post({ email, password })),
  logout: () => request<void>("/auth/logout", post()),
  me: () => request<{ data: AuthUser }>("/auth/me"),
  forgotPassword: (email: string) =>
    request<{ data: { message: string } }>("/auth/forgot-password", post({ email })),
  resetPassword: (access_token: string, password: string) =>
    request<{ data: { message: string } }>("/auth/reset-password", post({ access_token, password })),
};
