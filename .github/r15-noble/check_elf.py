import json
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(sys.argv[1])
paths = [p for p in root.rglob("*") if p.is_file() and not p.is_symlink()]
names = {p.name for p in root.rglob("*")}
rows = []
missing = []
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
            missing.append([rel, name])
    for name in interpreter:
        if pathlib.PurePosixPath(name).name not in names:
            missing.append([rel, name])
    rows.append({"path": rel, "machine": machine, "needed": needed, "interpreter": interpreter,
                 "unsupportedArchitecture": unsupported})
    if unsupported:
        missing.append([rel, "unsupported ELF machine " + machine])
print(json.dumps({"elf": rows, "missing": missing}, indent=2))
assert rows and not missing, "ELF inventory has unsupported or unresolved entries"
