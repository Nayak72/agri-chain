import { mkdir, writeFile } from "node:fs/promises";

const response = await fetch(process.env.API_OPENAPI_URL ?? "http://localhost:8000/openapi.json");
if (!response.ok) throw new Error(`OpenAPI request failed: ${response.status}`);
const spec = await response.json();
await mkdir("lib/api", { recursive: true });
await writeFile("lib/api/openapi.json", `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Wrote OpenAPI snapshot with ${Object.keys(spec.paths ?? {}).length} paths`);
