import fs from "node:fs";
import path from "node:path";
const failures = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "server") failures.push(name);
      visit(name);
      continue;
    }
    if (/\.server\.|\.remote\.|\+server\./.test(entry.name))
      failures.push(name);
    if (!/\.(svelte|ts|js|css)$/.test(name)) continue;
    const text = fs.readFileSync(name, "utf8");
    for (const forbidden of [
      /\$lib\/server/,
      /\$app\/forms/,
      /\$app\/server/,
      /\$env\/.*private/,
      /from ['"](?:pg|drizzle-orm|better-auth)/,
      /\?\//,
      /tailwindcss|shadcn-svelte/,
    ])
      if (forbidden.test(text)) failures.push(`${name}: ${forbidden}`);
  }
}
visit("src");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
  if (
    /^(pg|drizzle-orm|drizzle-kit|better-auth|tailwindcss|shadcn-svelte|@sveltejs\/adapter-node)$/.test(
      name,
    )
  )
    failures.push(`dependency:${name}`);
for (const name of fs.readdirSync("."))
  if (/^(drizzle|docker-compose|\.env$)/.test(name))
    failures.push(`artifact:${name}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  "Frontend boundary verified: no backend runtime, schema, credentials, server actions, Tailwind or shadcn.",
);
