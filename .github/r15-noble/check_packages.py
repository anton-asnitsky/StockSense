import json
import pathlib
import sys

proof = pathlib.Path(sys.argv[1])
sbom = json.loads((proof / "kiota.cdx.json").read_text())
status = (proof / "dpkg-status").read_text()
controls = []
for stanza in status.strip().split("\n\n"):
    fields = {}
    for line in stanza.splitlines():
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            fields[key] = value.strip()
    if "Package" in fields:
        controls.append(fields)
control_ids = {(c["Package"], c["Version"]) for c in controls}
assert len(control_ids) == len(controls), "duplicate control identity"
sbom_ids = {(c["name"], c["version"]) for c in sbom["components"]
            if c.get("purl", "").startswith("pkg:deb/")}
assert control_ids <= sbom_ids, f"missing binaries {control_ids - sbom_ids}"
sources = {(c.get("Source", c["Package"]).split(" ")[0], c["Version"]) for c in controls}
assert sbom_ids - control_ids <= sources, f"unexplained source identities {sbom_ids - control_ids - sources}"
for c in sbom["components"]:
    if (c.get("name"), c.get("version")) in sbom_ids - control_ids:
        assert any(p["name"] == "syft:package:foundBy" and p["value"] == "elf-binary-package-cataloger"
                   for p in c.get("properties", [])), "unproven supplemental source identity"
assert all(c["Architecture"] in ("amd64", "all") for c in controls)
inputs = json.loads((proof / "snapshot-inputs.json").read_text())
packages = []
for identity in sorted(control_ids):
    matched = []
    for file in proof.glob("package-*.control"):
        text = file.read_text()
        fields = dict(line.split(": ", 1) for line in text.splitlines()
                      if ": " in line and not line.startswith(" "))
        if (fields.get("Package"), fields.get("Version")) == identity:
            name = file.name.removeprefix("package-").removesuffix(".control")
            paths = [p for p in inputs if pathlib.PurePosixPath(p).name == name]
            assert len(paths) == 1
            matched.append({"package": identity[0], "version": identity[1],
                            "architecture": fields["Architecture"], "source": fields.get("Source", identity[0]),
                            "path": paths[0], "bytes": inputs[paths[0]][0], "sha256": inputs[paths[0]][1]})
    assert len(matched) == 1, identity
    packages.extend(matched)
(proof / "package-lock.json").write_text(json.dumps(packages, indent=2) + "\n")
print(json.dumps(packages, indent=2))
