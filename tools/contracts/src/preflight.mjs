import { ContractError } from './package-loader.mjs';

export const LIMITS = Object.freeze({
  sourceBytes: 1_048_576,
  packageBytes: 33_554_432,
  references: 1024,
  referenceDepth: 32,
  validatorMs: 60_000,
  generatorMs: 120_000,
  processBytes: 2_147_483_648,
  diagnostics: 200
});

const deny = (code, ruleId, message) => { throw new ContractError(code, ruleId, message); };
const credentialAssignment = /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|authorization)["']?\s*[:=]\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s,;}\]\r\n]+))/gi;
const credentialPlaceholder = /^(?:synthetic:|example:|placeholder:|\$\{)/i;
const protectedPatterns = [
  { rule: 'NFR6.1', name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { rule: 'NFR6.1', name: 'raw supplier document', pattern: /(?:rawSupplierDocument|supplierSourceContent|supplierDocumentBase64|supplierPdfBytes|raw_catalog_text)["']?\s*[:=]/i },
  { rule: 'NFR6.1', name: 'full prompt', pattern: /(?:fullPrompt|systemPromptText|promptTranscript|completePrompt)["']?\s*[:=]/i },
  { rule: 'NFR6.1', name: 'hidden reasoning', pattern: /(?:hiddenReasoning|chainOfThought|privateReasoning|reasoningTrace)["']?\s*[:=]/i }
];

export function inspectContent(path, bytes) {
  const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (input.length > LIMITS.sourceBytes) deny('SOURCE_SIZE_LIMIT', 'NFR10.1', 'A source exceeds the 1 MiB limit');
  if (input.subarray(0, 5).toString() === '%PDF-') deny('PROTECTED_CONTENT', 'NFR6.1', 'Raw supplier documents are prohibited');
  const value = input.toString('utf8');
  if (Buffer.from(value, 'utf8').length !== input.length || value.includes('\0')) deny('BINARY_CONTENT', 'NFR6.1', 'Canonical inputs must be UTF-8 text');
  for (const match of value.matchAll(credentialAssignment)) {
    const assigned = match[1] ?? match[2] ?? match[3];
    if (!credentialPlaceholder.test(assigned)) deny('PROTECTED_CONTENT', 'NFR6.1', 'Prohibited credential content');
  }
  for (const { rule, name, pattern } of protectedPatterns) {
    if (pattern.test(value)) deny('PROTECTED_CONTENT', rule, 'Prohibited ' + name + ' content');
  }
  const declaration = /\.d\.ts$/i.test(path);
  const executableManifest = /(?:^|[\\/])(?:package|deno)\.json$/i.test(path);
  if (!declaration && (
    /(?:^|\n)\s*(?:preinstall|postinstall|prepare|prepublish|scripts|x-generator-hook|x-exec)\s*:/i.test(value) ||
    /"(?:preinstall|postinstall|prepare|prepublish|x-generator-hook|x-exec)"\s*:/i.test(value) ||
    executableManifest && /(?:"(?:scripts|tasks)"\s*:|(?:^|\n)\s*(?:scripts|tasks)\s*:)/i.test(value)
  )) {
    deny('HOOK_FORBIDDEN', 'NFR6.2', 'Repository-controlled execution hooks are prohibited');
  }
  return true;
}

export function inspectReferences(references, { allowedRemote = {} } = {}) {
  if (!Array.isArray(references)) deny('REFERENCE_POLICY', 'NFR6.2', 'Reference list is invalid');
  if (references.length > LIMITS.references) deny('REFERENCE_LIMIT', 'NFR10.1', 'Reference count exceeds 1024');
  const nodes = new Map();
  for (const ref of references) {
    if (!ref || typeof ref.from !== 'string' || typeof ref.to !== 'string') deny('REFERENCE_POLICY', 'NFR6.2', 'Reference is malformed');
    if (/^https?:\/\//i.test(ref.to)) {
      if (!/^https:\/\//i.test(ref.to) || !/^sha256:[0-9a-f]{64}$/.test(allowedRemote[ref.to] ?? '')) {
        deny('REFERENCE_POLICY', 'NFR6.2', 'Remote reference lacks an allowlisted integrity pin');
      }
    } else if (ref.to.startsWith('/') || ref.to.includes('\\') || ref.to.split('/').includes('..') || ref.to.startsWith('file:')) {
      deny('REFERENCE_POLICY', 'NFR6.2', 'Reference escapes the package');
    }
    nodes.set(ref.from, [...(nodes.get(ref.from) ?? []), ref.to]);
  }
  function visit(node, stack, depth) {
    if (stack.has(node)) deny('REFERENCE_CYCLE', 'NFR10.1', 'Recursive reference detected');
    if (depth > LIMITS.referenceDepth) deny('REFERENCE_DEPTH_LIMIT', 'NFR10.1', 'Reference nesting exceeds 32');
    for (const next of nodes.get(node) ?? []) visit(next, new Set([...stack, node]), depth + 1);
  }
  for (const node of nodes.keys()) visit(node, new Set(), 0);
  return references.length;
}

export function enforcePackageBudget(loaded) {
  if (loaded.totalBytes > LIMITS.packageBytes) deny('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Package input exceeds 32 MiB');
  return loaded.totalBytes;
}

export function sanitizeFinding(finding) {
  const code = String(finding.code ?? '').replace(/[^A-Z0-9_]/g, '').slice(0, 64);
  const ruleId = String(finding.ruleId ?? '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64);
  const severity = ['information', 'warning', 'error'].includes(finding.severity) ? finding.severity : 'error';
  const path = String(finding.path ?? '').replace(/\\/g, '/');
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..')) {
    deny('UNSAFE_DIAGNOSTIC', 'NFR10.1', 'Finding path is unsafe');
  }
  const location = Number.isInteger(finding.line) && finding.line > 0 ? finding.line : 1;
  return { code, ruleId, severity, path, line: Math.min(location, 1_000_000),
    message: 'Contract validation failed; inspect the named rule and source location.' };
}

export function limitFindings(findings) {
  if (findings.length > LIMITS.diagnostics) deny('DIAGNOSTIC_LIMIT', 'NFR10.1', 'Public diagnostic limit exceeded');
  return findings.map(sanitizeFinding);
}
