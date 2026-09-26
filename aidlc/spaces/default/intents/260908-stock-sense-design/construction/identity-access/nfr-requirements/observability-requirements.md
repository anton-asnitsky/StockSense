# Identity Access Observability Requirements

Unit: U3 Identity Access (`identity-access`)

## Signal policy

U3 emits OpenTelemetry metrics and traces plus authoritative structured
security/audit events. Telemetry is diagnostic and disposable; PostgreSQL audit
and outbox records remain authoritative. Signal loss or OpenSearch failure
cannot block identity state commits.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | U3 shall emit bounded metrics and traces for request count/duration/outcome, sign-in method, lockout, rate-limit denial, token/refresh result, Google dependency health, key lifecycle, stored-routine latency, outbox lag, and telemetry loss. Labels shall not contain account IDs, retailer IDs, tokens, claims, document text, or unbounded error strings. | Cardinality and canary tests inspect collector output and OpenSearch; all required signals resolve by stable names and no prohibited value appears. | Drop or aggregate unsafe labels, increment a loss/redaction counter, and preserve the business operation where security permits. |
| NFR10.3 | Alert immediately on signing/data-protection key load or integrity failure and refresh-token reuse. Alert when the five-minute U3 server-error rate exceeds 2% or an NFR1 p95 target remains breached for ten minutes. | Synthetic probes trigger and resolve each alert, preserving threshold, window, route class, revision, runbook link, and notification evidence. | Keep the alert active until the measured condition clears; missing telemetry creates a distinct observability-degraded alert rather than a healthy state. |
| NFR15.1 | The identity dashboard shall show local/Google sign-in outcomes, lockouts and throttles, token/refresh results, Google health, active/next/retained key lifecycle, pod dependency readiness, PostgreSQL routine latency, and audit/outbox/projector lag. | A checksummed dashboard export and seeded scenario prove every panel, data source, time range, tenant-safe filter, and no-data behavior. | Mark unavailable or stale data explicitly; never infer zero failures from absent signals. |
| NFR15.3 | Every identity NFR acceptance run shall produce revision-bound evidence linking requirement IDs, environment, configuration digest, commands, timestamps, actual outcomes, limitations, and artifact checksums. | The evidence manifest resolves all IDs and files and preserves passed, failed, limited, and not-run results. | Reject incomplete evidence and prohibit a successful-control claim. |

## Required events and correlation

- Correlation spans BFF authorization start, U3 protocol processing, stored
  routine, audit/outbox commit, and projection without recording protocol
  secrets.
- Security events include generic authentication denial, lockout, link denial or
  completion, refresh reuse, session revocation, key staging/activation/
  retirement/failure, credential rotation, and privileged reset outcome.
- Actor and account references are included only in the authoritative audit
  path and authorized projections; operational metrics use bounded categories.

## Dashboard and runbooks

Runbooks cover key-load failure, database unready, Google outage, elevated
errors/latency, lockout spike, refresh reuse, outbox lag, projection lag, and
telemetry loss. Each names a safe diagnostic query, containment, recovery,
verification, and evidence-capture step.

## Limitations

Alert thresholds demonstrate the local portfolio profile. Low demo volume may
make percentage alerts noisy, so immediate security/readiness alerts and
synthetic probes remain required.
