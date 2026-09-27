import fs from "node:fs";
import wire from "../src/lib/api/wire.schema.json";
import { operations } from "../src/lib/api/operations";
const schemas: Record<string, unknown> = {
  ...wire.PageDataMap.definitions,
  ...wire.AppData.definitions,
};
function refs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(refs);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "$ref" && typeof item === "string"
          ? item.replace("#/definitions/", "#/components/schemas/")
          : refs(item),
      ]),
    );
  return value;
}
const envelope = (schema: unknown) => ({
  type: "object",
  required: ["data"],
  properties: { data: schema },
});
const json = (schema: unknown) => ({ "application/json": { schema } });
const errorResponse = {
  description: "Authoritative API error; never substitute demo data.",
  content: json({
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          fields: { type: "object", additionalProperties: { type: "string" } },
          requestId: { type: "string" },
        },
      },
    },
  }),
};
const paths: Record<string, unknown> = {};
for (const [route, schema] of Object.entries(
  wire.PageDataMap.definitions.PageDataMap.properties,
)) {
  if (route === "/login") continue;
  const parameters: unknown[] = [
    {
      name: "q",
      in: "query",
      schema: { type: "string" },
      description: "Optional search text where supported.",
    },
    {
      name: "status",
      in: "query",
      schema: { type: "string" },
      description: "Optional display filter where supported.",
    },
  ];
  if (route.includes(":id"))
    parameters.push({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Opaque resource identifier.",
    });
  paths["/views" + route.replace(":id", "{id}")] = {
    get: {
      summary: `Read the ${route} screen projection`,
      operationId: "view_" + route.replace(/[^a-z]/g, "_"),
      parameters,
      responses: {
        "200": {
          description:
            "Backend-owned view; monetary fields are decimal string paise.",
          content: json(envelope(refs(schema))),
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "503": errorResponse,
      },
    },
  };
}
const fields: Record<string, { required: string[]; optional?: string[] }> = {
  signIn: { required: ["email", "password"] },
  signOut: { required: [] },
  switchHostel: { required: ["hostelId"] },
  createOrganization: { required: ["name"], optional: ["slug"] },
  toggleOrganization: { required: ["organizationId", "currentStatus"] },
  toggleManager: { required: ["bindingId", "isActive"] },
  checkIn: {
    required: [
      "fullName",
      "phone",
      "gender",
      "roomId",
      "bedId",
      "ratePlanId",
      "agreedRentPaise",
      "agreedDepositPaise",
      "billingDay",
      "checkInDate",
    ],
    optional: ["email", "expectedEndDate"],
  },
  checkOut: { required: ["residentId", "checkOutDate"], optional: ["notes"] },
  updateResident: {
    required: ["residentId", "fullName", "phone"],
    optional: ["email", "emergencyContactName", "emergencyContactPhone"],
  },
  recordPayment: {
    required: ["residentId", "invoiceId", "amountPaise", "paymentMethod"],
    optional: ["reference", "notes"],
  },
  setBedStatus: { required: ["bedId", "targetStatus"] },
};
for (const [operation, descriptor] of Object.entries(operations)) {
  const field = fields[operation];
  const properties = Object.fromEntries(
    [...field.required, ...(field.optional ?? [])].map((name) => [
      name,
      {
        type: "string",
        ...(name.endsWith("Paise")
          ? {
              pattern: "^[0-9]+$",
              description: "Exact integer paise as a decimal string.",
            }
          : {}),
      },
    ]),
  );
  const requestSchema = {
    type: "object",
    required: field.required,
    properties,
    additionalProperties: false,
  };
  schemas[operation + "Request"] = requestSchema;
  const parameters: unknown[] = [
    {
      name: "Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
      description:
        "The same key and payload must return the same committed outcome. Different payload with same key is a conflict.",
    },
  ];
  if (operation !== "signIn")
    parameters.push({
      name: "X-CSRF-Token",
      in: "header",
      required: true,
      schema: { type: "string" },
    });
  if (descriptor.resource)
    parameters.push({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  const path = descriptor.path.replace(":id", "{id}");
  paths[path] = {
    ...((paths[path] as object) ?? {}),
    [descriptor.method.toLowerCase()]: {
      operationId: operation,
      summary: operation,
      parameters,
      requestBody: {
        required: true,
        content: json({ $ref: `#/components/schemas/${operation}Request` }),
      },
      responses: {
        "200": {
          description:
            "One completed business operation. Authentication endpoints also set/clear HttpOnly session cookies.",
          content: json(
            envelope({
              type: "object",
              required: ["success", "message"],
              properties: {
                success: { const: true },
                message: { type: "string" },
                resourceId: { type: "string" },
                redirectTo: {
                  type: "string",
                  description: "Optional same-origin relative UI path.",
                },
              },
            }),
          ),
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "409": errorResponse,
        "422": errorResponse,
        "501": errorResponse,
        "503": errorResponse,
      },
    },
  };
}
paths["/session"] = {
  ...(paths["/session"] as object),
  get: {
    operationId: "readSession",
    responses: {
      "200": {
        description:
          "Session context with a CSRF token, or null when unauthenticated.",
        content: json(
          envelope({
            anyOf: [
              {
                allOf: [
                  { $ref: "#/components/schemas/AppData" },
                  {
                    type: "object",
                    required: ["csrfToken"],
                    properties: { csrfToken: { type: "string", minLength: 1 } },
                  },
                ],
              },
              { type: "null" },
            ],
          }),
        ),
      },
      "401": errorResponse,
    },
  },
};
const document = {
  openapi: "3.1.0",
  info: {
    title: "EasyPG Frontend Integration Contract",
    version: "0.1.0",
    description:
      "UI contract for an independently implemented backend. It prescribes no SQL tables or database engine. All authorization, current availability, balances and atomicity remain the API responsibility. Demo simulation is not evidence of backend correctness.",
  },
  servers: [{ url: "/api/v1" }],
  paths,
  components: { schemas: refs(schemas) },
};
fs.writeFileSync("docs/openapi.json", JSON.stringify(document, null, 2) + "\n");
console.log(
  "Generated OpenAPI: view projections, sessions and 11 business commands.",
);
