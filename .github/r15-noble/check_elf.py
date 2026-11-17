import json
import hashlib
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(sys.argv[1])
paths = [p for p in root.rglob("*") if p.is_file() and not p.is_symlink()]
names = {p.name for p in root.rglob("*")}
rows = []
missing = []
disabled = []
optional_provider = "/usr/share/dotnet/shared/Microsoft.NETCore.App/10.0.15/libcoreclrtraceptprovider.so"
for p in paths:
    with p.open("rb") as f:
        if f.read(4) != b"\x7fELF":
            continue
    rel = "/" + str(p.relative_to(root))
    output = subprocess.run(["readelf", "-h", "-d", "-l", str(p)], check=True, capture_output=True,
                            text=True).stdout
    machine = re.search(r"Machine:\s*(.+)", output).group(1).strip()
    needed = re.findall(r"\(NEEDED\).*?\[(.*?)\]", output)
    interpreter = re.findall(r"Requesting program interpreter:\s*([^\]]+)", output)
    unsupported = machine != "Advanced Micro Devices X86-64"
    for name in needed:
        if name not in names:
            if rel == optional_provider and name == "liblttng-ust.so.0":
                disabled.append([rel, name])
            else:
                missing.append([rel, name])
    for name in interpreter:
        if pathlib.PurePosixPath(name).name not in names:
            missing.append([rel, name])
    rows.append({"path": rel, "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
                 "machine": machine, "needed": needed, "interpreter": interpreter,
                 "disabledOptionalLttng": rel == optional_provider,
                 "unsupportedArchitecture": unsupported})
    if unsupported:
        missing.append([rel, "unsupported ELF machine " + machine])
print(json.dumps({"elf": rows, "missing": missing, "disabledOptionalDependencies": disabled}, indent=2))
assert rows and not missing, "ELF inventory has unsupported or unresolved entries"
assert disabled == [[optional_provider, "liblttng-ust.so.0"]]
