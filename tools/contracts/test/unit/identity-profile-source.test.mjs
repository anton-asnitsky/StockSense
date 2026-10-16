import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import { detectDialect, DIALECTS } from '../../src/validators.mjs';

const sourceRoot = new URL('../../../../contracts/source/identity-access/v1/', import.meta.url);
const ajv = new Ajv2020({ strict: true, allErrors: true });

async function loadProfile(name, boundaryId) {
  const path = `identity-access/v1/${name}.shared-schema.yaml`;
  const bytes = await readFile(new URL(`${name}.shared-schema.yaml`, sourceRoot));
  const schema = YAML.parse(bytes.toString('utf8'), { strict: true, uniqueKeys: true });
  assert.equal(detectDialect({ document: path, artifactKind: 'schema', boundaryIds: [boundaryId] }, bytes).dialect, DIALECTS.schema);
  return ajv.compile(schema);
}

const googleProfile = () => ({
  kind: 'oidc-federation-profile', version: '1.0.0', provider: 'google', availability: 'optional',
  flow: 'authorization_code', pkce: 'S256',
  requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat'],
  optionalClaims: ['email', 'email_verified', 'name'],
  verification: ['issuer', 'audience', 'signature', 'lifetime', 'state', 'nonce', 'code', 'pkce'],
  localIdentityKey: ['issuer', 'subject'],
  linking: {
    automaticEmailLinking: 'prohibited', explicitAuthorizedLink: 'required',
    retailerMembershipInheritance: 'prohibited', audit: 'required'
  },
  failureBehavior: {
    callbackValidationFailure: 'deny-and-audit', providerUnavailable: 'preserve-local-demo-login'
  }
});

const bffProfile = () => ({
  kind: 'oidc-bff-integration-profile', version: '1.0.0',
  provider: 'identity-access', consumer: 'web-bff', browserOidcClient: 'web-bff-only',
  flow: 'authorization_code', pkce: 'S256',
  oidcResponseValidation: { state: 'required', nonce: 'required', code: 'one-time', codeReplay: 'reject' },
  callback: {
    registeredRedirectPath: '/signin-oidc', browserContinuationPath: '/auth/callback',
    continuation: 'post-middleware-validated-only'
  },
  tokens: { storage: 'server-side', browserExposure: 'prohibited' },
  session: {
    cookieName: '__Host-stocksense-session', secure: true, httpOnly: true,
    rotation: 'required', invalidatedCookieReplay: 'reject'
  },
  csrf: { mutations: 'validate' }, logout: { bffSession: 'invalidate' },
  delegatedRecovery: {
    audience: 'stocksense-recovery', principal: 'human-operator',
    tokenSource: 'server-held-delegated-user-access-token',
    clientCredentials: 'prohibited', callerSuppliedSubjectHeader: 'prohibited'
  }
});

function rejects(validate, profile, keyword) {
  assert.equal(validate(profile), false, 'invalid profile was accepted');
  assert.ok(validate.errors.some(error => error.keyword === keyword), JSON.stringify(validate.errors));
}

const google = await loadProfile('google-federation', 'C20');
const bff = await loadProfile('bff-integration', 'C16');

test('C20 accepts the optional Google federation profile with audited explicit linking', () => {
  assert.equal(google(googleProfile()), true, JSON.stringify(google.errors));
});

test('C20 requires the complete verified identity and local link policy', () => {
  const missingClaims = googleProfile();
  delete missingClaims.requiredClaims;
  rejects(google, missingClaims, 'required');
  const missingAudit = googleProfile();
  delete missingAudit.linking.audit;
  rejects(google, missingAudit, 'required');
});

test('C20 rejects changed claim sets and email-based account identity', () => {
  rejects(google, { ...googleProfile(), requiredClaims: ['iss', 'sub', 'aud', 'iat'] }, 'const');
  rejects(google, { ...googleProfile(), localIdentityKey: ['email'] }, 'const');
  rejects(google, { ...googleProfile(), optionalClaims: ['email', 'name'] }, 'const');
  rejects(google, { ...googleProfile(), verification: ['issuer', 'audience', 'lifetime'] }, 'const');
});

test('C20 rejects automatic linking and inherited retailer membership', () => {
  rejects(google, { ...googleProfile(), linking: { ...googleProfile().linking, automaticEmailLinking: 'allowed' } }, 'const');
  rejects(google, { ...googleProfile(), linking: { ...googleProfile().linking, retailerMembershipInheritance: 'allowed' } }, 'const');
});

test('C20 preserves denial and local-demo availability with closed fields', () => {
  rejects(google, { ...googleProfile(), availability: 'mandatory' }, 'const');
  rejects(google, { ...googleProfile(), failureBehavior: { ...googleProfile().failureBehavior, providerUnavailable: 'deny-all-login' } }, 'const');
  rejects(google, { ...googleProfile(), linking: { ...googleProfile().linking, unreviewedLink: true } }, 'additionalProperties');
});

test('C16 accepts the sole BFF code/PKCE client and session boundary', () => {
  assert.equal(bff(bffProfile()), true, JSON.stringify(bff.errors));
});

test('C16 rejects another browser OIDC client or weaker flow', () => {
  rejects(bff, { ...bffProfile(), browserOidcClient: 'browser', flow: 'implicit' }, 'const');
  rejects(bff, { ...bffProfile(), pkce: 'plain' }, 'const');
});

test('C16 distinguishes the registered redirect from its validated continuation', () => {
  rejects(bff, { ...bffProfile(), callback: { ...bffProfile().callback, registeredRedirectPath: '/auth/callback' } }, 'const');
  rejects(bff, { ...bffProfile(), callback: { ...bffProfile().callback, continuation: 'direct-code-callback' } }, 'const');
  rejects(bff, { ...bffProfile(), oidcResponseValidation: { ...bffProfile().oidcResponseValidation, codeReplay: 'accept' } }, 'const');
});

test('C16 requires protected server-held tokens, cookie replay rejection and mutation CSRF', () => {
  rejects(bff, { ...bffProfile(), tokens: { storage: 'browser', browserExposure: 'allowed' } }, 'const');
  rejects(bff, { ...bffProfile(), session: { ...bffProfile().session, secure: false, invalidatedCookieReplay: 'accept' } }, 'const');
  rejects(bff, { ...bffProfile(), csrf: { mutations: 'optional' } }, 'const');
});

test('C16 permits only a delegated human recovery token and closes undeclared fields', () => {
  rejects(bff, { ...bffProfile(), delegatedRecovery: { ...bffProfile().delegatedRecovery, clientCredentials: 'allowed' } }, 'const');
  rejects(bff, { ...bffProfile(), delegatedRecovery: { ...bffProfile().delegatedRecovery, callerSuppliedSubjectHeader: 'allowed' } }, 'const');
  rejects(bff, { ...bffProfile(), session: { ...bffProfile().session, scriptReadable: true } }, 'additionalProperties');
});
