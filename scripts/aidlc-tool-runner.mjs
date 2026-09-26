import { pathToFileURL } from "node:url";

const [toolPath, ...toolArgs] = process.argv.slice(2);
if (!toolPath) {
  throw new Error("Missing AI-DLC tool path.");
}

const tool = await import(pathToFileURL(toolPath).href);
if (typeof tool.main !== "function") {
  throw new Error(`${toolPath} does not export main(argv).`);
}

await tool.main(toolArgs);
