# Vulnerable validator positive control

`validator-node-24.22.2.grype-raw.json` preserves the exact 63,945 raw bytes from
GitHub Actions run 45851142043, lane 2, artifact 15133553936, image evidence
`validator.grype-raw.json`. SHA256:
`574ff840ccc320963fbc37d0a7778992170d5fc008a4273da3af5f53000a4384`.

The source candidate was `3fef097f5a7f87885d6453dfd3017ec23751a1b1` and image ID
`sha256:441dfe0576e821bbb86623a68b0e4107684e26f322174d24fb67af876e643aad`.
The full source SBOM digest was
`sha256:375d2f4f5d29926e91f1df7670a8c202aa2480b10ec3b9d9f9dd6a47a030040b`.
The source artifact ZIP SHA256 was
`4656c1a02a2771e49f4a2d5c3f88ae4118342e138b68cc04f181cb1af7d2101e`.

This historical test input is not current scan evidence or approval. Tests
supply their own current database status solely to exercise normalization,
row conservation and fixed High rejection. The fifteen binary Node findings
must remain visible, as must the five unresolved glibc findings. The original
image remains blocked; unknown fix reporting never authorizes an exception.
