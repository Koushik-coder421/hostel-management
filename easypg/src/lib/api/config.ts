export interface ApiConfig {
  mode: "demo" | "live";
  baseUrl: string;
}
export function parseConfig(
  mode: string | undefined,
  baseUrl = "/api/v1",
): ApiConfig {
  if (mode !== undefined && mode !== "demo" && mode !== "live") {
    throw new Error("VITE_API_MODE must be demo or live");
  }
  if (!baseUrl.startsWith("/") && !/^https?:\/\//.test(baseUrl)) {
    throw new Error(
      "VITE_API_BASE_URL must be an HTTP URL or same-origin path",
    );
  }
  if (baseUrl.startsWith("//"))
    throw new Error("Protocol-relative API URLs are not supported");
  return { mode: mode ?? "demo", baseUrl: baseUrl.replace(/\/$/, "") };
}
export const config = parseConfig(
  import.meta.env.VITE_API_MODE,
  import.meta.env.VITE_API_BASE_URL,
);
