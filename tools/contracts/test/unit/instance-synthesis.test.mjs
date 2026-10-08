import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLES_BY_PATTERN, omitRequired, synthesize } from '../../src/instance-synthesis.mjs';
import { createSchemaValidator, DIALECTS } from '../../src/validators.mjs';

const schema = body => ({ $schema: DIALECTS.schema, $id: 'https://contracts.stocksense.local/t.schema.json', ...body });
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('every audited pattern sample actually satisfies its pattern', () => {
  // The table is the whole safety argument: there is no regex solver, so a
  // sample that does not match its own pattern would silently produce a
  // non-conforming instance.
  for (const [pattern, sample] of Object.entries(SAMPLES_BY_PATTERN)) {
    assert.match(sample, new RegExp(pattern), `sample for ${pattern}`);
  }
});

test('a synthesized instance satisfies the schema it came from', () => {
  const subject = schema({
    type: 'object',
    required: ['id', 'digest', 'count', 'kind', 'nested', 'items', 'flag'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      digest: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' },
      count: { type: 'integer', minimum: 2, maximum: 9 },
      kind: { enum: ['first', 'second'] },
      flag: { type: 'boolean' },
      nested: { type: 'object', required: ['at'], properties: { at: { type: 'string', format: 'date-time' } } },
      items: { type: 'array', minItems: 2, items: { type: 'string', minLength: 12 } }
    },
    additionalProperties: false
  });
  const instance = synthesize(subject);
  assert.ok(createSchemaValidator(subject)(instance), JSON.stringify(instance));
  assert.equal(instance.kind, 'first');
  assert.equal(instance.count, 2);
  assert.equal(instance.items.length, 2);
  assert.ok(instance.items[0].length >= 12);
});

test('a const in a later allOf branch overrides the base it narrows', () => {
  // A branch that pins a discriminator is the reason the composition exists.
  const subject = schema({
    $defs: { base: { type: 'object', required: ['jobKind'], properties: { jobKind: { enum: ['a', 'b'] } } } },
    allOf: [{ $ref: '#/$defs/base' }, { type: 'object', properties: { jobKind: { const: 'b' } } }]
  });
  assert.equal(synthesize(subject).jobKind, 'b');
});

test('a cross-document reference resolves through the registry', () => {
  const shared = { $schema: DIALECTS.schema, $id: 'https://contracts.stocksense.local/shared.schema.json',
    type: 'object', required: ['value'], properties: { value: { type: 'string' } } };
  const subject = schema({ type: 'object', required: ['item'],
    properties: { item: { $ref: 'https://contracts.stocksense.local/shared.schema.json' } } });
  const registry = new Map([[shared.$id, shared]]);
  assert.deepEqual(synthesize(subject, { registry }), { item: { value: 'synthetic' } });
  // An unknown identity must fail rather than invent a shape.
  expectCode(() => synthesize(subject), 'SYNTH_REF');
});

test('an unaudited pattern or format fails loudly rather than guessing', () => {
  // A plausible-looking instance that does not conform is worse than none: the
  // fixture would be authored against a schema it never satisfied.
  expectCode(() => synthesize(schema({ type: 'string', pattern: '^[0-9]{3}-[A-Z]{2}$' })), 'SYNTH_PATTERN');
  expectCode(() => synthesize(schema({ type: 'string', format: 'ipv6' })), 'SYNTH_FORMAT');
  expectCode(() => synthesize(schema({ type: 'object', properties: { a: { enum: [] } }, required: ['a'] })), 'SYNTH_SHAPE');
});

test('omitting a required property yields the pointer the oracle will report', () => {
  const subject = { type: 'object', required: ['alpha', 'beta'],
    properties: { alpha: { type: 'string' }, beta: { type: 'string' } } };
  const instance = { alpha: 'one', beta: 'two' };
  const negative = omitRequired(subject, instance);
  assert.deepEqual(negative.payload, { beta: 'two' });
  assert.equal(negative.pointer, '/alpha');
  // A pointer segment with a slash or tilde must be escaped the same way the
  // finding path is, or the declared oracle would never match.
  assert.equal(omitRequired({ required: ['a/b~c'] }, { 'a/b~c': 1 }).pointer, '/a~1b~0c');
  assert.equal(omitRequired({ type: 'object' }, {}), null);
});

test('the negative payload fails for exactly the omitted property', () => {
  const subject = schema({ type: 'object', required: ['alpha', 'beta'],
    properties: { alpha: { type: 'string' }, beta: { type: 'string' } } });
  const validate = createSchemaValidator(subject);
  const positive = synthesize(subject);
  assert.ok(validate(positive));
  const negative = omitRequired(subject, positive);
  assert.equal(validate(negative.payload), false);
  const required = validate.errors.filter(error => error.keyword === 'required');
  assert.equal(required.length, 1);
  assert.equal(required[0].params.missingProperty, 'alpha');
});

test('each contains constraint is met by a distinct element', () => {
  // This is the real shape of the protocol-compatibility package list: an
  // array whose allOf demands one member per language. Synthesizing the same
  // element twice satisfies minItems and fails the contains.
  const subject = schema({
    $defs: { entry: { type: 'object', required: ['language', 'name'],
      properties: { language: { enum: ['dotnet', 'python'] }, name: { type: 'string', minLength: 1 } } } },
    type: 'array', minItems: 2, maxItems: 2, items: { $ref: '#/$defs/entry' },
    allOf: [
      { contains: { type: 'object', required: ['language'], properties: { language: { const: 'dotnet' } } } },
      { contains: { type: 'object', required: ['language'], properties: { language: { const: 'python' } } } }
    ]
  });
  const instance = synthesize(subject);
  assert.ok(createSchemaValidator(subject)(instance), JSON.stringify(instance));
  assert.deepEqual(instance.map(entry => entry.language), ['dotnet', 'python']);
});

test('a met if/then narrows the property it pins', () => {
  // The discriminator decides the package name, so the consequent has to be
  // applied after the base instance exists.
  const subject = schema({
    type: 'object', required: ['language', 'name'],
    properties: { language: { enum: ['python', 'dotnet'] }, name: { type: 'string', minLength: 1 } },
    allOf: [
      { if: { properties: { language: { const: 'dotnet' } }, required: ['language'] },
        then: { properties: { name: { const: 'StockSense.Messaging' } } } },
      { if: { properties: { language: { const: 'python' } }, required: ['language'] },
        then: { properties: { name: { const: 'stocksense-messaging' } } } }
    ]
  });
  const instance = synthesize(subject);
  assert.ok(createSchemaValidator(subject)(instance), JSON.stringify(instance));
  // The enum pins python, so only the second consequent may apply.
  assert.deepEqual(instance, { language: 'python', name: 'stocksense-messaging' });
});

test('a unique array of an enumerated type takes distinct members', () => {
  const subject = schema({
    $defs: { suite: { enum: ['first', 'second', 'third'] } },
    type: 'array', minItems: 3, maxItems: 3, uniqueItems: true, items: { $ref: '#/$defs/suite' }
  });
  assert.deepEqual(synthesize(subject), ['first', 'second', 'third']);
  assert.ok(createSchemaValidator(subject)(synthesize(subject)));
  // Without enough members to draw on, or with no enumeration at all, there is
  // no honest way to fill the array.
  expectCode(() => synthesize(schema({ type: 'array', minItems: 4, uniqueItems: true,
    items: { enum: ['only', 'two'] } })), 'SYNTH_SHAPE');
  expectCode(() => synthesize(schema({ type: 'array', minItems: 2, uniqueItems: true,
    items: { type: 'string' } })), 'SYNTH_SHAPE');
});
