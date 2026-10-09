import type { ApiConfig } from "./config";
import { ApiError } from "./errors";

export { ApiError };

export function createHttp(config: ApiConfig, fetcher: typeof fetch = fetch) {
  let csrfToken: string | undefined;
  let authToken: string | undefined =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") || undefined : undefined;

  const instance = {
    setCsrfToken(token?: string) {
      csrfToken = token;
      if (token) {
        authToken = token;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("token", token);
        }
      } else {
        authToken = undefined;
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("token");
        }
      }
    },
    setAuthToken(token?: string) {
      instance.setCsrfToken(token);
    },
    getAuthToken(): string | undefined {
      return authToken || (typeof localStorage !== "undefined" ? localStorage.getItem("token") || undefined : undefined);
    },
    async request(
      path: string,
      options: {
        method?: string;
        body?: unknown;
        idempotencyKey?: string;
        login?: boolean;
        fetcher?: typeof fetch;
      } = {},
    ): Promise<unknown> {
      const method = options.method ?? "GET";
      const tokenToUse = instance.getAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };

      if (tokenToUse) {
        headers["Authorization"] = `Bearer ${tokenToUse}`;
      }

      if (method !== "GET") {
        if (!options.login && !csrfToken && !tokenToUse)
          throw new ApiError(
            "Your session needs refreshing before this action. Reload and sign in again.",
            401,
            "SESSION_REQUIRED",
          );
        headers["Content-Type"] = "application/json";
        if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
        if (options.idempotencyKey)
          headers["Idempotency-Key"] = options.idempotencyKey;
      }

      let response: Response;
      try {
        response = await (options.fetcher ?? fetcher)(
          `${config.baseUrl}${path}`,
          {
            method,
            headers,
            credentials: "include",
            body:
              options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
            signal: AbortSignal.timeout(15000),
            redirect: "error",
          },
        );
      } catch {
        throw new ApiError(
          "The configured API could not be reached. No demo data has been substituted. Retry when the connection is restored.",
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json"))
        throw new ApiError(
          "The API returned a non-JSON response. Check the API URL and static-host routing.",
          response.status,
          "INVALID_RESPONSE",
        );

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiError(
          "The API returned invalid JSON",
          502,
          "INVALID_RESPONSE",
        );
      }

      if (!response.ok) {
        const failure = payload as {
          message?: string;
          error?: {
            message?: string;
            code?: string;
            fields?: Record<string, string>;
            requestId?: string;
          };
        };

        if (response.status === 401) {
          instance.setCsrfToken(undefined);
        }

        const errorMessage =
          failure?.error?.message ?? failure?.message ?? `API request failed (${response.status})`;

        console.error(`[API Error ${response.status}] ${method} ${path}:`, {
          status: response.status,
          message: errorMessage,
          payload
        });

        throw new ApiError(
          errorMessage,
          response.status,
          failure?.error?.code ?? "REQUEST_FAILED",
          failure?.error?.fields,
          failure?.error?.requestId,
        );
      }

      if (!payload || typeof payload !== "object")
        throw new ApiError(
          "API response is invalid",
          502,
          "INVALID_RESPONSE",
        );

      const payloadObj = payload as Record<string, unknown>;
      if ("data" in payloadObj && payloadObj.data !== undefined && payloadObj.data !== null) {
        return payloadObj.data;
      }

      return payloadObj;
    },
  };

  return instance;
}

export const BASE_URL = "/api";

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const hasBody = options.body !== undefined && options.body !== null;
  const method = options.method || "GET";

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {})
  };

  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data: any;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (typeof data === "object" && data !== null && (data.message || data.error?.message)) ||
      (typeof data === "string" && data.length > 0 ? data : response.statusText) ||
      `HTTP Error ${response.status}`;

    console.error(`[API Error ${response.status}] ${method} ${url}:`, {
      status: response.status,
      message: errorMessage,
      data
    });

    throw new ApiError(
      errorMessage,
      response.status,
      typeof data === "object" && data?.error?.code ? data.error.code : "REQUEST_FAILED"
    );
  }

  return data as T;
}
