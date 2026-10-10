import { ContractError } from './package-loader.mjs';

// Synthesize a minimal conforming instance for a JSON Schema 2020-12 subschema.
//
// This exists to author revision-bound fixture pairs for every bindable
// canonical document. Hand-writing 58 payloads against real schemas invites
// exactly the errors fixtures are supposed to catch, so the positive case is
// derived from the schema and then verified by the real oracle; a negative is
// the positive with one required property removed, which yields an exact
// SCHEMA_REQUIRED at a known pointer.
//
// There is no regex solver here on purpose. Every `pattern` in the canonical
// sources is matched by its literal text against a table of known-good
// samples, so a sample is auditable and an unrecognised pattern fails loudly
// rather than producing a plausible-looking instance that does not conform.

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const DIGEST = 'sha256:' + 'a'.repeat(64);
export const SAMPLES_BY_PATTERN = Object.freeze({
  '^sha256:[0-9a-f]{64}$': DIGEST,
  '^[a-z][a-z0-9.]+$': 'retail.inventory.updated',
  '^[a-z][a-z0-9-]{2,63}$': 'retail-data',
  '^sha256/[0-9a-f]{64}$': 'sha256/' + 'a'.repeat(64),
  '^[0-9a-f]{40}$': 'a'.repeat(40),
  '^[0-9a-f]{32}$': 'a'.repeat(32),
  '^[0-9a-f]{40}([0-9a-f]{24})?$': 'a'.repeat(40),
  '^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$': '1.0.0',
  '^1\\.[0-9]+\\.[0-9]+$': '1.0.0',
  '^C(0[1-9]|1[0-9]|2[0-7])$': 'C01',
  '^[A-Z0-9][A-Z0-9._-]{2,79}$': 'CHECK.ONE',
  '^stocksense\\.recovery\\.command\\.v1\\.[a-z][a-z0-9-]*$': 'stocksense.recovery.command.v1.retail-data',
  '^>=[1-9][0-9]*\\.[0-9]+\\.[0-9]+ <[1-9][0-9]*\\.[0-9]+\\.[0-9]+$': '>=1.0.0 <2.0.0',
  '^(?!/)(?!.*(^|/)\\.\\.(/|$))(?!.*:)[A-Za-z0-9._/-]+$': 'common/v1/message-envelope.schema.json'
});

const SAMPLES_BY_FORMAT = Object.freeze({
  uuid: '11111111-1111-4111-8111-111111111111',
  'date-time': '2026-01-01T00:00:00Z',
  date: '2026-01-01',
  uri: 'https://contracts.stocksense.local/sample',
  'uri-reference': '/api/v1/sample',
  binary: 'c3ludGhldGlj',
  hostname: 'stocksense.local',
  email: 'synthetic@stocksense.local',
  'idn-email': 'synthetic@stocksense.local'
});

function resolveRef(ref, root, registry) {
  if (typeof ref !== 'string') fail('SYNTH_REF', 'BR2.7', 'Reference is not a string');
  if (ref.startsWith('#')) {
    const parts = ref.slice(1).split('/').filter(Boolean).map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    let node = root;
    for (const part of parts) {
      if (!object(node) || !Object.hasOwn(node, part)) fail('SYNTH_REF', 'BR2.7', `Cannot resolve ${ref}`);
      node = node[part];
    }
    return { schema: node, root };
  }
  const [identity, fragment] = ref.split('#');
  const target = registry.get(identity);
  if (!target) fail('SYNTH_REF', 'BR2.7', `Cannot resolve external reference ${ref}`);
  return fragment ? resolveRef('#' + fragment, target, registry) : { schema: target, root: target };
}

/** Follow a chain of references to the subschema that actually carries keywords. */
function deref(schema, root, registry) {
  let current = schema;
  let base = root;
  const seen = new Set();
  while (object(current) && typeof current.$ref === 'string') {
    if (seen.has(current.$ref)) fail('SYNTH_REF', 'BR2.7', `Reference cycle at ${current.$ref}`);
    seen.add(current.$ref);
    ({ schema: current, root: base } = resolveRef(current.$ref, base, registry));
  }
  return { schema: current, root: base };
}

/**
 * Flatten an allOf of object subschemas into one required set and one property
 * map, each property remembering the document it came from so its own relative
 * references still resolve. Returns null when a branch is not an object, which
 * is the signal to fall back to merging instances.
 *
 * An `if`/`then` branch is kept aside as a conditional and applied once the
 * instance exists, because whether it applies depends on the value the
 * discriminator ended up with. A `not`, or an `if` that turns on anything
 * subtler than a pinned value, is ignored; the oracle verifies every instance,
 * so an ignored constraint shows up as a rejected positive, never a false pass.
 */
function flattenObject(branches, registry, depth) {
  if (depth > 24) fail('SYNTH_DEPTH', 'BR2.7', 'Schema nests deeper than synthesis allows');
  const required = [];
  const properties = new Map();
  const conditionals = [];
  const add = name => { if (!required.includes(name)) required.push(name); };

  for (const branch of branches) {
    const { schema, root } = deref(branch.schema, branch.root, registry);
    if (schema === true || schema === undefined) continue;
    if (!object(schema)) return null;

    const types = schema.type === undefined ? [] : [].concat(schema.type);
    if (types.length && !types.includes('object')) return null;

    if (object(schema.if) && object(schema.then)) {
      conditionals.push({ condition: schema.if, consequent: schema.then, root });
    }
    if (!(Object.hasOwn(schema, 'properties') || Object.hasOwn(schema, 'required') || Array.isArray(schema.allOf))) continue;

    if (Array.isArray(schema.allOf)) {
      const nested = flattenObject([
        { schema: { ...schema, allOf: undefined }, root },
        ...schema.allOf.map(item => ({ schema: item, root }))
      ], registry, depth + 1);
      if (!nested) return null;
      for (const name of nested.required) add(name);
      for (const [name, target] of nested.properties) properties.set(name, target);
      conditionals.push(...nested.conditionals);
      continue;
    }
    for (const name of schema.required ?? []) add(name);
    if (object(schema.properties)) {
      for (const [name, sub] of Object.entries(schema.properties)) properties.set(name, { schema: sub, root });
    }
  }
  return required.length || properties.size ? { required, properties, conditionals } : null;
}

/**
 * Whether a condition is met by values already pinned in the instance. Only a
 * `const` or a single-member `enum` counts as pinned: anything else is reported
 * as unmet so that no consequent is applied on a guess.
 */
function conditionMet(condition, instance, root, registry) {
  const { schema } = deref(condition, root, registry);
  if (!object(schema) || !object(schema.properties)) return false;
  for (const name of schema.required ?? []) if (!Object.hasOwn(instance, name)) return false;
  for (const [name, sub] of Object.entries(schema.properties)) {
    if (!Object.hasOwn(instance, name)) continue;
    const pinned = object(sub) && Object.hasOwn(sub, 'const') ? sub.const
      : object(sub) && Array.isArray(sub.enum) && sub.enum.length === 1 ? sub.enum[0] : undefined;
    if (pinned === undefined || instance[name] !== pinned) return false;
  }
  return true;
}

/**
 * Build an object from a flattened composition, then let every met conditional
 * narrow the properties it pins.
 */
function buildObject(flat, synth, registry, depth) {
  const instance = {};
  for (const name of flat.required) {
    const target = flat.properties.get(name);
    instance[name] = target ? synth(target) : {};
  }
  for (const { condition, consequent, root } of flat.conditionals) {
    if (!conditionMet(condition, instance, root, registry)) continue;
    const applied = flattenObject([{ schema: consequent, root }], registry, depth + 1);
    if (!applied) continue;

    // A branch that requires a name usually declares it with an always-true
    // subschema, purely so the required name is defined where it is demanded.
    // Such an entry imposes nothing, so the property's real shape is the one
    // the enclosing object declares; taking the branch's entry instead would
    // replace a conforming value with an empty object.
    const imposes = target => target !== undefined && target.schema !== true &&
      !(object(target.schema) && Object.keys(target.schema).length === 0);
    const targetFor = name => {
      const narrowed = applied.properties.get(name);
      return imposes(narrowed) ? narrowed : flat.properties.get(name);
    };

    // A met consequent narrows what the base carries, and may also require a
    // property the base left optional - which is the whole point of a
    // conditional that pins extra fields for one discriminator value.
    for (const name of applied.required) {
      const target = targetFor(name);
      if (target) instance[name] = synth(target);
    }
    for (const [name] of applied.properties) {
      if (!Object.hasOwn(instance, name)) continue;
      const target = targetFor(name);
      if (target) instance[name] = synth(target);
    }
  }
  return instance;
}

/**
 * @param {any} schema a 2020-12 subschema
 * @param {{ root?: any, registry?: Map<string, any>, depth?: number }} [context]
 * @returns {any} a minimal instance that should satisfy `schema`
 */
export function synthesize(schema, context = {}) {
  const { root = schema, registry = new Map(), depth = 0 } = context;
  if (depth > 24) fail('SYNTH_DEPTH', 'BR2.7', 'Schema nests deeper than synthesis allows');
  if (schema === true) return {};
  if (!object(schema)) fail('SYNTH_SHAPE', 'BR2.7', 'Subschema is not an object');
  const next = overrides => synthesize(overrides.schema, { root: overrides.root ?? root, registry, depth: depth + 1 });

  if (schema.$ref) return next(resolveRef(schema.$ref, root, registry));
  if (Object.hasOwn(schema, 'const')) return schema.const;
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.length) fail('SYNTH_SHAPE', 'BR2.7', 'An empty enum admits no instance');
    return schema.enum[0];
  }
  // An allOf alongside a declared array or scalar type is not a composition to
  // merge: the base carries the shape and the branches carry constraints such
  // as `contains`, which the array case below reads for itself.
  const declared = [].concat(schema.type ?? []).filter(item => item !== 'null');

  // An object composition is flattened at the schema level, not the instance
  // level. A branch that narrows a referenced base - pinning a discriminator to
  // a const, say - is the reason the composition exists, and such a branch
  // usually declares the property without repeating `required`, so merging the
  // branch instances would drop the narrowing entirely.
  if (declared.every(item => item === 'object') && Array.isArray(schema.allOf)) {
    const flat = flattenObject([
      { schema: { ...schema, allOf: undefined }, root },
      ...schema.allOf.map(branch => ({ schema: branch, root }))
    ], registry, depth);
    if (flat) return buildObject(flat, next, registry, depth);
    // Anything that is not an object composition falls back to merging the
    // branch instances in declaration order, the last writer winning.
    return schema.allOf.reduce((merged, branch) => {
      const part = next({ schema: branch });
      return object(merged) && object(part) ? { ...merged, ...part } : part;
    }, undefined);
  }
  for (const key of ['oneOf', 'anyOf']) {
    if (Array.isArray(schema[key]) && schema[key].length) return next({ schema: schema[key][0] });
  }

  const type = declared[0] ?? (schema.properties || schema.required ? 'object' : 'string');

  if (type === 'object') {
    // A conditional declared directly on the object, rather than inside an
    // allOf, is still a conditional and has to narrow the result the same way.
    // Routing it through the same flattening is what makes a discriminator pin
    // its dependent properties whichever shape the author chose.
    if (object(schema.if) && object(schema.then)) {
      const flat = flattenObject([{ schema, root }], registry, depth);
      if (flat) return buildObject(flat, next, registry, depth);
    }
    const instance = {};
    const properties = object(schema.properties) ? schema.properties : {};
    for (const name of schema.required ?? []) {
      if (!Object.hasOwn(properties, name)) {
        // additionalProperties:false plus a required property with no schema
        // would be unsatisfiable; an empty object is the only honest guess and
        // the oracle will say if it is wrong.
        instance[name] = {};
        continue;
      }
      instance[name] = next({ schema: properties[name] });
    }
    return instance;
  }
  if (type === 'array') {
    const items = schema.items ?? schema.prefixItems?.[0] ?? true;
    // A `contains` is a constraint on a member, so each one has to be met by a
    // distinct element; an array that declares two of them needs at least two.
    const constraints = [schema.contains, ...(schema.allOf ?? []).map(branch => object(branch) ? branch.contains : null)]
      .filter(constraint => constraint !== undefined && constraint !== null);
    const count = Math.max(Number(schema.minItems ?? 0), constraints.length);
    const unique = schema.uniqueItems === true;
    const resolved = deref(items, root, registry).schema;
    const choices = object(resolved) && Array.isArray(resolved.enum) ? resolved.enum : null;

    return Array.from({ length: count }, (ignored, index) => {
      const constraint = constraints[index];
      if (constraint !== undefined) {
        // Meeting the constraint and the item schema at once is the same
        // flattening problem as an allOf, so reuse it; a constraint that pins a
        // scalar value stands on its own.
        const flat = flattenObject([{ schema: items, root }, { schema: constraint, root }], registry, depth);
        if (flat) return buildObject(flat, next, registry, depth);
        if (object(constraint) && (Object.hasOwn(constraint, 'const') || Array.isArray(constraint.enum))) {
          return next({ schema: constraint });
        }
        fail('SYNTH_CONTAINS', 'BR2.7', 'Cannot satisfy a contains constraint over this item schema');
      }
      // uniqueItems with an enumerated item type needs distinct members, so
      // repeating the first choice would produce an invalid instance.
      if (unique && choices) {
        if (index >= choices.length) fail('SYNTH_SHAPE', 'BR2.7', 'Too few enum members for a unique array');
        return choices[index];
      }
      if (unique && count > 1) fail('SYNTH_SHAPE', 'BR2.7', 'Cannot synthesize distinct members for this item schema');
      return next({ schema: items });
    });
  }
  if (type === 'boolean') return true;
  if (type === 'integer' || type === 'number') {
    const low = schema.minimum ?? (schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum + 1 : 1);
    const high = schema.maximum ?? (schema.exclusiveMaximum !== undefined ? schema.exclusiveMaximum - 1 : low);
    const value = Math.min(Math.max(low, 1), Math.max(high, low));
    return type === 'integer' ? Math.trunc(value) : value;
  }
  if (type === 'string') {
    if (schema.pattern) {
      const sample = SAMPLES_BY_PATTERN[schema.pattern];
      if (sample === undefined) {
        fail('SYNTH_PATTERN', 'BR2.7', `No audited sample for pattern ${schema.pattern}`);
      }
      return sample;
    }
    if (schema.format) {
      const sample = SAMPLES_BY_FORMAT[schema.format];
      if (sample === undefined) fail('SYNTH_FORMAT', 'BR2.7', `No audited sample for format ${schema.format}`);
      return sample;
    }
    const minimum = Number(schema.minLength ?? 0);
    const text = 'synthetic';
    return text.length >= minimum ? text : text.padEnd(minimum, 'x');
  }
  fail('SYNTH_SHAPE', 'BR2.7', `Unsupported type ${String(type)}`);
}

/**
 * The first required property whose removal leaves the rest of the instance
 * intact, with the JSON Pointer the oracle will report.
 *
 * The required set is read through the same flattening the synthesiser uses, so
 * a schema that composes its required names via `allOf` is handled. Reading
 * only the top-level `required` returned null for such a schema and the
 * document was reported as a problem rather than bound - latent today, since
 * no root schema in the catalogue composes that way, but it would have bitten
 * the first one that did.
 *
 * @param {any} schema
 * @param {any} instance
 * @param {{ root?: any, registry?: Map<string, any> }} [context]
 */
export function omitRequired(schema, instance, context = {}) {
  const { root = schema, registry = new Map() } = context;
  let declared = Array.isArray(schema?.required) ? schema.required : [];
  if (!declared.length && object(schema)) {
    let flat = null;
    try { flat = flattenObject([{ schema, root }], registry, 0); } catch { flat = null; }
    if (flat) declared = flat.required;
  }
  const required = declared.filter(name => Object.hasOwn(instance, name));
  if (!required.length) return null;
  const name = required[0];
  const reduced = { ...instance };
  delete reduced[name];
  return { payload: reduced, pointer: '/' + String(name).replace(/~/g, '~0').replace(/\//g, '~1') };
}

const pointer = name => '/' + String(name).replace(/~/g, '~0').replace(/\//g, '~1');

/**
 * The property values a condition demands, when every property it constrains is
 * pinned to a single value. Returns null otherwise, so a branch guarded by
 * anything subtler than a discriminator is left alone rather than guessed at.
 */
function pinnedBy(condition, root, registry) {
  const { schema } = deref(condition, root, registry);
  if (!object(schema) || !object(schema.properties)) return null;
  const pinned = {};
  for (const [name, sub] of Object.entries(schema.properties)) {
    if (!object(sub)) return null;
    if (Object.hasOwn(sub, 'const')) { pinned[name] = sub.const; continue; }
    if (Array.isArray(sub.enum) && sub.enum.length === 1) { pinned[name] = sub.enum[0]; continue; }
    return null;
  }
  return Object.keys(pinned).length ? pinned : null;
}

/**
 * Candidate negatives that violate something other than `required`.
 *
 * Until these existed, every negative in the catalogue was "the positive minus
 * one required property", so all 40 oracle rows asserted SCHEMA_REQUIRED and
 * nothing exercised an enum, a closed object, or the conditional discriminators
 * the catalogue leans on everywhere. The independent architecture review called
 * that a satisfiability-plus-required smoke test rather than boundary evidence,
 * which it was.
 *
 * Each candidate is only a proposal: the caller runs it through the real oracle
 * and declares whatever findings that produces, so a mutation that fails to
 * violate anything is discarded rather than credited.
 *
 * @param {any} schema the bound element's subschema
 * @param {any} instance a verified positive instance
 * @param {{ root?: any, registry?: Map<string, any> }} [context]
 * @returns {Array<{ kind: string, payload: any, note: string }>}
 */
export function negativeCandidates(schema, instance, context = {}) {
  const { root = schema, registry = new Map() } = context;
  if (!object(instance)) return [];
  const flat = flattenObject([{ schema, root }], registry, 0);
  if (!flat) return [];
  const candidates = [];

  // 1. An out-of-enum discriminator. The enumerated properties are usually the
  // discriminators the conditionals key on, so breaking one is the single most
  // contract-meaningful mutation available.
  for (const name of flat.required) {
    const target = flat.properties.get(name);
    if (!target || !Object.hasOwn(instance, name)) continue;
    const resolved = deref(target.schema, target.root ?? root, registry).schema;
    if (!object(resolved)) continue;
    const choices = Array.isArray(resolved.enum) ? resolved.enum
      : Object.hasOwn(resolved, 'const') ? [resolved.const] : null;
    if (!choices || !choices.length || typeof choices[0] !== 'string') continue;
    const invalid = 'not-' + String(choices[0]).slice(0, 24);
    if (choices.includes(invalid)) continue;
    candidates.push({
      kind: 'enum',
      payload: { ...instance, [name]: invalid },
      note: `${name} set outside its enumerated values`
    });
    break;
  }

  // 2. A closed object given an undeclared property. Only when the schema
  // actually closes itself, so this is never a guess about intent.
  const closed = [{ schema, root }].some(branch => {
    const resolved = deref(branch.schema, branch.root, registry).schema;
    return object(resolved) && resolved.additionalProperties === false;
  });
  if (closed && !Object.hasOwn(instance, 'stocksenseUndeclared')) {
    candidates.push({
      kind: 'additionalProperties',
      payload: { ...instance, stocksenseUndeclared: 'synthetic' },
      note: 'an undeclared property added to a closed object'
    });
  }

  // 3. A violated conditional. The positive cannot be mutated directly: the
  // synthesiser picks the first enumerated value for a discriminator, and the
  // catalogue's conditionals key on the *other* values - HeavyWorkRequest
  // synthesises workType "training" while its branches want "batch-forecast"
  // and "embedding-index" - so no branch is ever active on the positive and
  // there is nothing to break.
  //
  // So activate a branch first: pin the discriminator to the value the `if`
  // demands, fill in the properties that branch additionally requires, then
  // remove one of them. That exercises the discriminator path the contract
  // actually cares about, which the base required set never reaches.
  for (const { condition, consequent, root: branchRoot } of flat.conditionals) {
    const pinned = pinnedBy(condition, branchRoot, registry);
    if (!pinned) continue;
    const applied = flattenObject([{ schema: consequent, root: branchRoot }], registry, 1);
    if (!applied) continue;
    const extra = applied.required.filter(name => !flat.required.includes(name));
    if (!extra.length) continue;

    const variant = { ...instance, ...pinned };
    let buildable = true;
    for (const name of applied.required) {
      if (Object.hasOwn(variant, name)) continue;
      const narrowed = applied.properties.get(name);
      const imposes = narrowed !== undefined && narrowed.schema !== true &&
        !(object(narrowed.schema) && Object.keys(narrowed.schema).length === 0);
      const target = imposes ? narrowed : flat.properties.get(name);
      if (!target) { buildable = false; break; }
      try { variant[name] = synthesize(target.schema, { root: target.root ?? root, registry, depth: 1 }); }
      catch { buildable = false; break; }
    }
    if (!buildable) continue;

    const payload = { ...variant };
    delete payload[extra[0]];
    candidates.push({
      kind: 'conditional',
      payload,
      note: `${Object.keys(pinned).join(', ')} pinned to activate the branch, then ${extra[0]} removed`
    });
    break;
  }

  return candidates;
}

/** The pointer the oracle reports for a removed or altered property. */
export { pointer as propertyPointer };
