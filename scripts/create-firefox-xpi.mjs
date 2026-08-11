import { copyFile, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const basename = `${packageJson.name}-${packageJson.version}-firefox`;
const zip = new URL(`dist/${basename}.zip`, root);
const xpi = new URL(`dist/${basename}.xpi`, root);

await copyFile(zip, xpi);
console.log(`Created dist/${basename}.xpi (unsigned)`);
