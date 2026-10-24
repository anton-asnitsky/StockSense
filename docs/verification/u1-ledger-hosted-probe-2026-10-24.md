# U1 hosted ledger probe

This disposable child pull request exercises the US8.7 image build, scan, and
protected-main ledger verifier on an unmodified contract-tool source tree.
The expected result is a red U1 check because `security/image-exceptions.json`
has not yet been placed on protected `main`; no finding exception is approved.
