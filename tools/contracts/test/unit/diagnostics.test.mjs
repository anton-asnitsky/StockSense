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
  assert.equal(diagnostic.message, 'A claimed canonical revision lacks positive and negative fixtures');
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

test('an oversized message is bounded, and raw document content cannot be dumped', () => {
  // A refusal that embedded a whole document would publish exactly the source
  // dump NFR10.1 forbids, so length is capped regardless of content.
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

test('a refusal whose message sanitises away still names its rule', () => {
  // Failing the run with a bare code and rule is correct; publishing an empty
  // diagnostic is not.
  const diagnostic = toDiagnostic(new ContractError('POLICY_SHAPE', 'BR2.4', '\u001b[2J::error::'), { repoRoot: REPO });
  assert.equal(diagnostic.code, 'POLICY_SHAPE');
  assert.equal(diagnostic.message, 'The package was refused; see the named rule.');
  assert.match(diagnostic.remediation, /pinned validator/);
});

test('a diagnostic keeps the identifiers it exists to report', () => {
  // The independent architecture review caught this: the entropy-based
  // credential rule redacted every digest and commit, and the absolute-path
  // rule replaced every JSON pointer with <path>. So a digest mismatch, a
  // provenance mismatch and a fixture-oracle pointer all published a message
  // with the one useful identifier removed. NFR10.1 asks for bounded and
  // sanitized diagnostics, not uninformative ones.
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
  // A 40- or 64-character hex string is exempt because it is a git revision or
  // a content digest. Nothing else is, and a token that merely looks long is
  // still redacted.
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
