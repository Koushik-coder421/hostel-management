import { writable } from "svelte/store";
import { goto, invalidateAll } from "$app/navigation";
import { api } from "./client";
import { ApiError } from "./errors";
import { operations, type Operation, type CommandInput } from "./operations";
import { rupeesToWire } from "./transport";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface Feedback {
  success?: boolean;
  message?: string;
  error?: string;
  email?: string;
  fieldErrors?: Record<string, string>;
  code?: string;
}
export const feedback = writable<Feedback | null>(null);
export type FormResult =
  | { type: "success" | "failure"; data: Feedback }
  | { type: "redirect"; location: string }
  | { type: "error"; error: { message: string } };
type Update = (options?: { reset?: boolean }) => Promise<void>;
type AfterSubmit = (context: {
  result: FormResult;
  update: Update;
}) => void | Promise<void>;
type BeforeSubmit = (context: {
  formData: FormData;
  formElement: HTMLFormElement;
  cancel: () => void;
}) => void | AfterSubmit | Promise<void | AfterSubmit>;
export function safeRedirect(
  value: string | undefined,
  fallback = "/dashboard",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return fallback;
  return value;
}
const appliedRedirects = new WeakSet<object>();
export async function applyAction(result: FormResult) {
  if (result.type === "redirect") {
    if (appliedRedirects.has(result)) return;
    appliedRedirects.add(result);
  }
  if (result.type === "redirect") {
    feedback.set(null);
    await goto(safeRedirect(result.location), { invalidateAll: true });
  } else if (result.type === "error")
    feedback.set({ error: result.error.message });
  else feedback.set(result.data);
}
/** Browser form integration. This sends JSON commands, never SvelteKit server actions. */
export function enhance(
  formElement: HTMLFormElement,
  beforeSubmit?: BeforeSubmit,
) {
  let pending = false;
  let retry: { signature: string; key: string } | undefined;
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    feedback.set(null);
    const formData = new FormData(formElement);
    let cancelled = false;
    let callback: void | AfterSubmit = undefined;
    let result: FormResult;
    try {
      callback = await beforeSubmit?.({
        formData,
        formElement,
        cancel: () => {
          cancelled = true;
        },
      });
      if (cancelled) return;
      const operation = formElement.dataset.operation as Operation;
      if (!(operation in operations))
        throw new ApiError(
          "This action is not supported",
          400,
          "UNSUPPORTED_OPERATION",
        );
      const input: CommandInput = Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, String(value)]),
      );
      if (formElement.dataset.resourceId)
        input.residentId = formElement.dataset.resourceId;
      for (const [rupees, paise] of [
        ["agreedRentRupees", "agreedRentPaise"],
        ["agreedDepositRupees", "agreedDepositPaise"],
        ["amountRupees", "amountPaise"],
      ]) {
        if (input[rupees] !== undefined) {
          input[paise] = rupeesToWire(input[rupees]);
          delete input[rupees];
        }
      }
      const signature = JSON.stringify({ operation, input });
      if (!retry || retry.signature !== signature)
        retry = { signature, key: generateIdempotencyKey() };
      const outcome = await api.command(operation, input, retry.key);
      retry = undefined;
      const location =
        operation === "signOut"
          ? "/login"
          : operation === "signIn"
            ? safeRedirect(
                new URL(locationHref()).searchParams.get("redirectTo") ??
                  undefined,
              )
            : outcome.redirectTo;
      result = location
        ? { type: "redirect", location: safeRedirect(location) }
        : {
            type: "success",
            data: { success: true, message: outcome.message },
          };
    } catch (cause) {
      const error =
        cause instanceof ApiError
          ? cause
          : new ApiError("This action could not be completed");
      if (error.status >= 400 && error.status < 500) retry = undefined;
      result = {
        type: "failure",
        data: {
          error: error.message,
          message: error.message,
          email: String(formData.get("email") ?? ""),
          code: error.code,
          fieldErrors: error.fieldErrors,
        },
      };
    } finally {
      pending = false;
    }
    const update: Update = async (options) => {
      await applyAction(result);
      if (result.type === "success") {
        if (options?.reset !== false) formElement.reset();
        await invalidateAll();
      }
    };
    // Always publish errors even if a particular page callback does not call update().
    await applyAction(result);
    if (callback) await callback({ result, update });
    else await update();
  };
  formElement.addEventListener("submit", submit);
  return {
    destroy() {
      formElement.removeEventListener("submit", submit);
    },
  };
}
function locationHref() {
  return window.location.href;
}
