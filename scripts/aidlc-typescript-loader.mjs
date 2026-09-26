import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * AI-DLC's TypeScript tools use emitted-JavaScript import specifiers so the
 * same source can be compiled for every harness. Node's native TypeScript
 * execution does not remap those specifiers, so resolve a missing local
 * `.js` import to its checked-in `.ts` source.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "bun:ffi") {
    const source = [
      "export const FFIType = {};",
      "export function dlopen() {",
      "  throw new Error('bun:ffi is unavailable in the Node review-brief fallback.');",
      "}",
    ].join("\n");
    return {
      url: `data:text/javascript,${encodeURIComponent(source)}`,
      shortCircuit: true,
    };
  }

  const isLocal =
    specifier.startsWith("./") || specifier.startsWith("../");

  if (isLocal && specifier.endsWith(".js") && context.parentURL) {
    const javascriptUrl = new URL(specifier, context.parentURL);
    if (!existsSync(fileURLToPath(javascriptUrl))) {
      const typescriptUrl = new URL(
        specifier.slice(0, -3) + ".ts",
        context.parentURL,
      );
      if (existsSync(fileURLToPath(typescriptUrl))) {
        return { url: typescriptUrl.href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
