import Ajv from "ajv";
import addFormats from "ajv-formats";
import schemas from "./wire.schema.json";
import { ApiError } from "./errors";
import type { PageDataMap } from "./contracts";
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const views = schemas.PageDataMap;
const viewRoot = views.definitions.PageDataMap;
const checks = Object.fromEntries(
  Object.entries(viewRoot.properties).map(([route, schema]) => [
    route,
    ajv.compile({ ...schema, definitions: views.definitions }),
  ]),
);
const sessionCheck = ajv.compile(schemas.AppData);
export function validatePage(route: keyof PageDataMap, value: unknown): void {
  const check = checks[route];
  if (check && !check(value))
    throw new ApiError(
      "The API response does not match this screen’s documented contract",
      502,
      "INVALID_RESPONSE",
    );
}
export function validateSession(value: unknown): void {
  const val = value as { user?: { id?: string; name?: string; email?: string }; scope?: { userId?: string; role?: string }; csrfToken?: string } | null;
  if (
    !val ||
    typeof val !== "object" ||
    !val.user ||
    !val.scope ||
    !val.user.id ||
    !val.scope.role
  ) {
    throw new ApiError(
      "The API returned an invalid session response",
      502,
      "INVALID_SESSION",
    );
  }
}
