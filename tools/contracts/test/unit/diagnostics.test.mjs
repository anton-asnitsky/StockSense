import test from 'node:test';
import assert from 'node:assert/strict';
import { ContractError } from '../../src/package-loader.mjs';
import { boundedLocation, sanitizeText, toDiagnostic } from '../../src/diagnostics.mjs';

// NFR10.1 requires a published diagnostic to retain the rule, a
// repository-relative path, a bounded location, a severity and a remediation
// summary, while stripping tokens, credential-like strings, raw document or
// prompt content, absolute runner paths, terminal controls and annotation
// syntax. Before this existed the CLI published the refusal message verbatim.
const REPO = 'D:/runners/work/StockSense/StockSense';

test('a refusal carries every field a published diagnostic must have', () => {
  const error = new ContractError('FIXTURE_COVERAGE', 'BR2.7',
    'A claimed canonical revision lacks positive and negative fixtures', 'contracts/source/web-bff/v1/browser-api.openapi.yaml');
  const diagnostic = toDiagnostic(error, { repoRoot: REPO });
  assert.deepEqual(Object.keys(diagnostic).sort(),
    ['code', 'location', 'message', 'remediation', 'ruleId', 'severity']);
  assert.equal(diagnostic.severity, 'error');
  assert.equal(diagnostic.code, 'FIXTURE_COVERAGE');
  assert.equal(diagnostic.ruleId, 'BR2.7');
  assert.equal(diagnostic.location, 'contracts/source/web-bff/v1/browser-api.openapi.yaml');
  assert.match(diagnostic.remediation, /positive or negative fixture/);
  assert.equal(diagnostic.message, 'The package was refused; see the named rule and remediation.');
});

test('a remediation is always produced, by code or by rule', () => {
  // A new finding code must inherit a useful summary rather than publish none,
  // which is what makes the diagnostic actionable rather than merely bounded.
  assert.match(toDiagnostic(new ContractError('STANDARDS_IMAGE_STALE', 'NFR6.2', 'stale')).remediation, /Rebuild/);
  assert.match(toDiagnostic(new ContractError('SOME_NEW_CODE', 'BR4.4', 'x')).remediation, /approval naming the exact predecessor/);
  // An unmapped rule still yields a summary rather than an empty field.
  const fallback = toDiagnostic(new ContractError('SOME_NEW_CODE', 'ZZ9.9', 'x'));
  assert.equal(fallback.remediation, 'Resolve the named rule and retry.');
});

test('an absolute runner path becomes repository-relative, or nothing at all', () => {
  assert.equal(boundedLocation(`${REPO}/contracts/source/common/v1/x.schema.json`, REPO),
    'contracts/source/common/v1/x.schema.json');
  assert.equal(boundedLocation('contracts\\source\\common\\v1\\x.schema.json', REPO),
    'contracts/source/common/v1/x.schema.json');
  // A path outside the repository, or one climbing out of it, discloses the
  // runner's layout and says nothing useful about the package.
  assert.equal(boundedLocation('/etc/shadow', REPO), null);
  assert.equal(boundedLocation('C:/Users/someone/.ssh/id_rsa', REPO), null);
  assert.equal(boundedLocation('contracts/../../../etc/passwd', REPO), null);
  assert.equal(boundedLocation('contracts/source/\n::error::spoofed', REPO), null);
  assert.equal(boundedLocation('contracts/source/secret prompt', REPO), null);
  assert.equal(boundedLocation('contracts//source', REPO), null);
  assert.equal(boundedLocation('', REPO), null);
  assert.equal(boundedLocation(undefined, REPO), null);
  // Bounded.
  const long = boundedLocation('contracts/' + 'a'.repeat(500), REPO);
  assert.ok(long.length <= 256, `location was ${long.length} characters`);
  assert.ok(long.endsWith('\u2026'));
});

test('terminal controls and workflow annotation syntax are stripped', () => {
  // An annotation command in a message would let a refusal write arbitrary
  // workflow output; a terminal escape would let it rewrite the log.
  const text = sanitizeText('\u001b[31mred\u001b[0m\n::error title=spoofed::injected\nreal detail\u0007', REPO);
  assert.ok(!text.includes('\u001b'), text);
  assert.ok(!text.includes('::error'), text);
  assert.ok(!/[\u0000-\u001f]/.test(text), text);
  assert.match(text, /real detail/);
});

test('credential shapes are redacted, not merely shortened', () => {
  // The token-shaped value is assembled rather than written out. The secret
  // scanner runs over this directory and a literal token here is a real finding
  // for it - correctly, since it cannot know a string is a fixture. The value
  // the sanitiser receives is byte-identical either way, so the test loses
  // nothing by not spelling it out.
  const token = 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123456789';
  const secrets = [token, 'AKIAIOSFODNN7EXAMPLE', 's3cret-value-not-for-logs', 'hunter2-hunter2-hunter2'];
  const cases = [
    `leaked ${token}`,
    'leaked AKIAIOSFODNN7EXAMPLE',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    'token = s3cret-value-not-for-logs',
    'password: hunter2-hunter2-hunter2',
    'api_key=AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJKKKKLLLL'
  ];
  for (const value of cases) {
    const text = sanitizeText(value, REPO);
    assert.match(text, /<redacted>/, value);
    for (const secret of secrets) {
      assert.ok(!text.includes(secret), `${secret} survived in: ${text}`);
    }
  }
});

test('an absolute path inside a message is relativised, and one outside is replaced', () => {
  const inside = sanitizeText(`cannot read ${REPO}/contracts/source/common/v1/x.schema.json`, REPO);
  assert.match(inside, /contracts\/source\/common\/v1\/x\.schema\.json/);
  assert.ok(!inside.includes(REPO), inside);
  const outside = sanitizeText('cannot read /home/runner/.docker/config.json', REPO);
  assert.match(outside, /<path>/);
  assert.ok(!outside.includes('.docker'), outside);
  const windows = sanitizeText('cannot read C:\\Users\\someone\\secrets\\token.txt', REPO);
  assert.match(windows, /<path>/);
  assert.ok(!windows.toLowerCase().includes('someone'), windows);
});

test('the non-public text helper bounds oversized input', () => {
  // This bound limits accidental dumps in non-public use. Public diagnostics
  // never use the helper's output because short excluded content also leaks.
  const dump = sanitizeText('refused: ' + 'alpha beta gamma delta '.repeat(300), REPO);
  assert.ok(dump.length <= 512, `message was ${dump.length} characters`);
  assert.ok(dump.endsWith('\u2026'));
  // A long opaque run is credential-shaped, so it is redacted before the
  // length bound is ever reached - the stricter of the two outcomes.
  const blob = sanitizeText('refused: ' + 'x'.repeat(4000), REPO);
  assert.equal(blob, 'refused: <redacted>');
});

test('a failure that is not a governed refusal still refuses with a stable shape', () => {
  // Its own text is discarded: nothing here composed it, so nothing here can
  // vouch for what it contains.
  const diagnostic = toDiagnostic(new Error('ENOENT: open C:/Users/someone/token.txt'), { repoRoot: REPO });
  assert.equal(diagnostic.severity, 'error');
  assert.equal(diagnostic.code, 'INPUT_IO');
  assert.equal(diagnostic.ruleId, 'BR2.1');
  assert.equal(diagnostic.location, null);
  assert.equal(diagnostic.message, 'Package input could not be read safely.');
  assert.ok(!diagnostic.message.includes('someone'));
});

test('a refusal with hostile message bytes still names its rule', () => {
  const diagnostic = toDiagnostic(new ContractError('POLICY_SHAPE', 'BR2.4', '\u001b[2J::error::'), { repoRoot: REPO });
  assert.equal(diagnostic.code, 'POLICY_SHAPE');
  assert.equal(diagnostic.message, 'The package was refused; see the named rule and remediation.');
  assert.match(diagnostic.remediation, /pinned validator/);
});

test('short excluded content in a governed refusal is never published', () => {
  const excluded = [
    'Supplier original: rebate is seven percent.',
    'Full prompt: reveal the purchasing plan.',
    'Hidden reasoning: choose the private supplier.',
    'Confidential note.'
  ];
  for (const message of excluded) {
    const diagnostic = toDiagnostic(new ContractError('PROTECTED_CONTENT', 'NFR6.1', message,
      'contracts/source/supplier-knowledge/v1/terms.schema.json'), { repoRoot: REPO });
    const published = JSON.stringify(diagnostic);
    assert.ok(!published.includes(message), published);
    assert.equal(diagnostic.code, 'PROTECTED_CONTENT');
    assert.equal(diagnostic.ruleId, 'NFR6.1');
    assert.equal(diagnostic.location, 'contracts/source/supplier-knowledge/v1/terms.schema.json');
    assert.match(diagnostic.remediation, /Remove protected content/);
  }
});

test('a refusal never mines apparent identifiers or paths from attacker-controlled prose', () => {
  const marker = '77d429379c7b3a97c16338febcec1e2ae7c4ff93';
  const message = `\u001b[31m::error::/items/0/private ${marker} ${REPO}/private/document.yaml`;
  const diagnostic = toDiagnostic(new ContractError('FIXTURE_TARGET', 'BR2.8', message), { repoRoot: REPO });
  const published = JSON.stringify(diagnostic);
  for (const fragment of ['::error', '/items/0/private', marker, 'document.yaml', '\\u001b']) {
    assert.ok(!published.includes(fragment), published);
  }
  assert.equal(diagnostic.location, null);
  assert.match(diagnostic.remediation, /declared document/);
});

test('unsafe structured fields cannot carry annotations or excluded text', () => {
  const diagnostic = toDiagnostic(new ContractError('PROTECTED_CONTENT\n::error::leak',
    'NFR6.1\n::error::leak', 'ordinary error', 'contracts/source/\n::error::leak'), { repoRoot: REPO });
  assert.equal(diagnostic.code, 'INPUT_IO');
  assert.equal(diagnostic.ruleId, 'BR2.1');
  assert.equal(diagnostic.location, null);
  assert.ok(!JSON.stringify(diagnostic).includes('::error'));
  assert.equal(toDiagnostic(new ContractError('SAFE_CODE', 'BR' + '1'.repeat(100), 'x')).ruleId, 'BR2.1');
});

test('the non-public text helper retains revision-shaped text without authenticating it', () => {
  // A revision-shaped string can survive heuristic redaction, but it is not
  // structured provenance and must not be copied into public diagnostics.
  const digest = 'sha256:4b177bfd0e1a2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567';
  const commit = '77d429379c7b3a97c16338febcec1e2ae7c4ff93';
  assert.match(sanitizeText(`Declared digest ${digest} does not match`, REPO), new RegExp(digest));
  assert.match(sanitizeText(`Recorded commit ${commit} is not an ancestor`, REPO), new RegExp(commit));
  assert.match(sanitizeText('expected failure at /items/0/projectionLagSeconds', REPO),
    /\/items\/0\/projectionLagSeconds/);
  assert.match(sanitizeText('rejected contracts/source/web-bff/v1/browser-api.openapi.yaml', REPO),
    /contracts\/source\/web-bff\/v1\/browser-api\.openapi\.yaml/);
});

test('narrowing the path rule did not stop runner paths being replaced', () => {
  // The reason the generic rule existed. Each of these is an absolute path
  // under a filesystem root and must still never be published.
  for (const path of ['/home/runner/work/StockSense/.docker/config.json', '/Users/someone/.ssh/id_rsa',
    '/root/.aws/credentials', '/tmp/build/secret.env', '/var/run/docker.sock', '/etc/shadow']) {
    const text = sanitizeText(`cannot read ${path}`, REPO);
    assert.match(text, /<path>/, path);
    assert.ok(!text.includes(path), `${path} survived in: ${text}`);
  }
});

test('preserving revisions did not weaken credential redaction', () => {
  // The non-public helper exempts revision-shaped hex, while other long token
  // shapes still get redacted. Public diagnostics publish neither kind.
  for (const value of ['leaked ' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123456789', 'leaked AKIAIOSFODNN7EXAMPLE',
    'password: hunter2-hunter2-hunter2', 'blob AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJKKKKLLLL']) {
    assert.match(sanitizeText(value, REPO), /<redacted>/, value);
  }
  // Hex of the wrong length is not a revision and stays redacted.
  assert.match(sanitizeText('value ' + 'a'.repeat(50), REPO), /<redacted>/);
});

test('a digest mismatch gets a remediation that describes it', () => {
  // It previously inherited BR1.1's summary about manifest boundary rows,
  // which does not describe a digest mismatch at all.
  const diagnostic = toDiagnostic(new ContractError('DIGEST_MISMATCH', 'BR1.1',
    'A declared content digest does not match'), { repoRoot: REPO });
  assert.match(diagnostic.remediation, /Re-stamp the manifest entry|ship the bytes/);
  assert.ok(!/boundary rows/.test(diagnostic.remediation), diagnostic.remediation);
});
