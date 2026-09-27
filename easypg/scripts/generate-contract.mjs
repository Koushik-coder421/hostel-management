import { createGenerator } from "ts-json-schema-generator";
import fs from "node:fs";
const schemas = {};
for (const name of ["PageDataMap", "AppData"]) {
  const schema = createGenerator({
    path: "src/lib/api/contracts.ts",
    type: name,
    skipTypeCheck: true,
    additionalProperties: true,
  }).createSchema(name);
  function wire(node) {
    if (!node || typeof node !== "object") return;
    if (node.properties)
      for (const [key, value] of Object.entries(node.properties)) {
        if (key.endsWith("Paise"))
          node.properties[key] = {
            type: "string",
            pattern: "^-?[0-9]+$",
            description:
              "Integer paise as a decimal string; never floating point rupees.",
          };
        else wire(value);
      }
    for (const [key, value] of Object.entries(node))
      if (key !== "properties") {
        if (Array.isArray(value)) value.forEach(wire);
        else if (value && typeof value === "object") wire(value);
      }
  }
  wire(schema);
  schemas[name] = schema;
}
fs.writeFileSync(
  "src/lib/api/wire.schema.json",
  JSON.stringify(schemas, null, 2) + "\n",
);
console.log("Generated wire schemas from independent presentation contracts.");
