import pathlib
import subprocess

path = pathlib.Path("context/chisel-wrapper")
text = path.read_text()
old = 'sed "/Package:\\s*$pkg/,/^\\s*$/d" -i "$CHISEL_DPKG_STATUS_FILE"'
new = 'sed "/^Package:[[:space:]]*$pkg$/,/^[[:space:]]*$/d" -i "$CHISEL_DPKG_STATUS_FILE"'
assert text.count(old) == 1
text = text.replace(old, new)
pattern = new.split('"')[1].replace("$pkg", "tzdata")
fixture = "Package: tzdata-legacy\nVersion: 1\n\nPackage: tzdata\nVersion: 1\n\n"
result = subprocess.run(["sed", pattern], input=fixture, text=True, capture_output=True, check=True).stdout
assert result == "Package: tzdata-legacy\nVersion: 1\n\n"
path.write_text(text)
print("Exact package replacement retains tzdata-legacy when updating tzdata")
