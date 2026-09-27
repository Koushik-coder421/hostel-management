import { error, redirect } from "@sveltejs/kit";
import { api } from "./client";
import { ApiError } from "./errors";
import type { PageDataMap } from "./contracts";
export async function loadView<K extends keyof PageDataMap>(
  route: K,
  params: Record<string, string> = {},
  fetcher?: typeof fetch,
) {
  try {
    return await api.readView(route, params, fetcher);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401)
      redirect(307, "/login");
    error(
      cause instanceof ApiError && cause.status >= 400 && cause.status < 600
        ? cause.status
        : 503,
      {
        message:
          cause instanceof Error ? cause.message : "Unable to load this screen",
      },
    );
  }
}
