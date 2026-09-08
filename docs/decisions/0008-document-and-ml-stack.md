# ADR 0008: MongoDB, Python and MLflow

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

- MongoDB stores supplier source documents and extraction/validation records.
- Python implements forecasting, model training and evaluation.
- MLflow tracks experiments and manages model versions.

These choices confirm the roles proposed in the design. They do not select
implementation versions, model algorithms, embedding models or an LLM provider.

## Boundaries and execution impact

MongoDB access remains tenant-scoped. Accepted supplier terms are authoritative
in PostgreSQL; Qdrant stores the retrieval index with source/version references.
SS-21 verifies provenance and isolation across those boundaries.

Python jobs run within the Kubernetes resource budget and access business data
through authorized APIs. They do not bypass PostgreSQL's routine-only access
policy. SS-13 and SS-18 implement reproducible baselines and temporal evaluation.

MLflow has an isolated metadata store and operator-only access. SS-19 links runs
and models to data, code and configuration versions and verifies promotion and
rollback. Artifact storage uses the existing local design until a cloud profile
is chosen. Version compatibility and resource sizing are implementation checks.
