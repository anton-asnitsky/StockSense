"""Build a signed, byte-locked Ubuntu rootfs for the Kiota image."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import ssl
import subprocess
import sys
import tarfile
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def verify_bytes(data, algorithm, expected, size=None):
    if algorithm not in ("sha256", "sha384"):
        raise ValueError("Unsupported digest algorithm")
    if size is not None and len(data) != size:
        raise ValueError("Locked input length changed")
    if hashlib.new(algorithm, data).hexdigest() != expected:
        raise ValueError("Locked input digest changed")
    return data


def snapshot_url(value):
    if not re.fullmatch(r"[0-9]{8}T[0-9]{6}Z", value):
        raise ValueError("A fixed UTC snapshot is required")
    return "https://snapshot.ubuntu.com/ubuntu/" + value + "/"


def adapt_wrapper(text):
    changes = {
        'dir="$CHISEL_CACHE_DIR/chisel/sha256"': 'dir="$CHISEL_CACHE_DIR/chisel"',
        'for f in "$dir"/*; do': 'for f in "$dir"/sha*/*; do',
        'sed "/Package:\\s*$pkg/,/^\\s*$/d" -i "$CHISEL_DPKG_STATUS_FILE"':
        'sed "/^Package:[[:space:]]*$pkg$/,/^[[:space:]]*$/d" -i "$CHISEL_DPKG_STATUS_FILE"',
    }
    for old, new in changes.items():
        if text.count(old) != 1:
            raise ValueError("Upstream wrapper differs from reviewed source")
        text = text.replace(old, new)
    return text


class RuntimeInputTests(unittest.TestCase):
    def test_mutated_input_is_rejected(self):
        expected = hashlib.sha256(b"reviewed").hexdigest()
        self.assertEqual(verify_bytes(b"reviewed", "sha256", expected, 8), b"reviewed")
        with self.assertRaises(ValueError):
            verify_bytes(b"modified", "sha256", expected, 8)
        with self.assertRaises(ValueError):
            verify_bytes(b"reviewed", "sha256", expected, 9)

    def test_snapshot_must_be_fixed(self):
        self.assertEqual(snapshot_url("20261116T000000Z"),
                         "https://snapshot.ubuntu.com/ubuntu/20261116T000000Z/")
        for value in ("latest", "../archive", "20261116", "20261116T000000Z?now"):
            with self.assertRaises(ValueError):
                snapshot_url(value)

    def test_exact_package_replacement(self):
        expression = '/^Package:[[:space:]]*$pkg$/,/^[[:space:]]*$/d'.replace("$pkg", "tzdata")
        fixture = "Package: tzdata-legacy\nVersion: 1\n\nPackage: tzdata\nVersion: 1\n\n"
        result = subprocess.run(["sed", expression], input=fixture, text=True,
                                capture_output=True, check=True).stdout
        self.assertEqual(result, "Package: tzdata-legacy\nVersion: 1\n\n")


def tool_bytes(item):
    with urllib.request.urlopen(item["url"], timeout=120) as response:
        data = response.read()
    return verify_bytes(data, item["algorithm"], item["digest"])


def prepare_tools(lock, work, proof):
    chisel = tool_bytes(lock["tools"]["chisel"])
    with tarfile.open(fileobj=io.BytesIO(chisel), mode="r:gz") as archive:
        member = archive.getmember("chisel")
        if not member.isfile():
            raise ValueError("Chisel archive contains no regular executable")
        (work / "chisel").write_bytes(archive.extractfile(member).read())
    (work / "chisel").chmod(0o755)
    slices = tool_bytes(lock["tools"]["slices"])
    extracted = work / "slice-archive"
    extracted.mkdir()
    with tarfile.open(fileobj=io.BytesIO(slices), mode="r:gz") as archive:
        archive.extractall(extracted, filter="data")
    roots = list(extracted.iterdir())
    if len(roots) != 1 or not (roots[0] / "chisel.yaml").is_file():
        raise ValueError("Slice archive root is ambiguous")
    wrapper = adapt_wrapper(tool_bytes(lock["tools"]["wrapper"]).decode("utf-8"))
    (work / "chisel-wrapper").write_text(wrapper)
    (work / "chisel-wrapper").chmod(0o755)
    (proof / "effective-chisel-wrapper").write_text(wrapper)
    shutil.copy(roots[0] / "chisel.yaml", proof / "effective-chisel.yaml")
    (proof / "slices.tar.gz").write_bytes(slices)
    return roots[0]


def cut_rootfs(lock, work, proof, release):
    snapshot = snapshot_url(lock["snapshot"])
    records = {}
    controls = {}
    errors = []
    mutex = threading.Lock()

    class SnapshotRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if not newurl.startswith(snapshot):
                raise ValueError("Redirect outside the locked snapshot")
            return super().redirect_request(req, fp, code, msg, headers, newurl)

    opener = urllib.request.build_opener(SnapshotRedirect())

    class SnapshotHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            try:
                parsed = urllib.parse.urlsplit(self.path)
                if (parsed.scheme != "http" or parsed.hostname != "archive.ubuntu.com" or
                        not parsed.path.startswith("/ubuntu/") or ".." in parsed.path or
                        parsed.query or parsed.fragment):
                    raise ValueError("Request outside the Ubuntu archive")
                relative = parsed.path.removeprefix("/ubuntu/")
                if relative not in lock["snapshotInputs"]:
                    raise ValueError("Unexpected snapshot path " + relative)
                size, digest = lock["snapshotInputs"][relative]
                with opener.open(snapshot + relative, timeout=120) as response:
                    data = verify_bytes(response.read(), "sha256", digest, size)
                with mutex:
                    records[relative] = [size, digest]
                    if relative.endswith("/InRelease"):
                        (proof / relative.replace("/", "_")).write_bytes(data)
                    if relative.endswith(".deb"):
                        control = subprocess.run(["dpkg-deb", "-f", "-"], input=data,
                                                 check=True, capture_output=True).stdout.decode()
                        controls[relative] = control
                        (proof / ("package-" + PurePosixPath(relative).name + ".control")).write_text(control)
                self.send_response(200)
                self.send_header("Content-Length", str(size))
                self.end_headers()
                self.wfile.write(data)
            except Exception as error:
                errors.append(str(error))
                self.send_error(502, "Locked archive input refused")

    server = ThreadingHTTPServer(("127.0.0.1", 0), SnapshotHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    proxy = "http://127.0.0.1:" + str(server.server_port)
    root = Path("/rootfs")
    (root / "var/lib/dpkg").mkdir(parents=True)
    slices = """base-files_base base-files_chisel base-files_release-info ca-certificates_data
libc6_libs libgcc-s1_libs libicu74_libs libssl3t64_libs libstdc++6_libs
tzdata-legacy_zoneinfo tzdata_zoneinfo""".split()
    environment = {**os.environ, "CHISEL_BIN": str(work / "chisel"),
                   "HTTP_PROXY": proxy, "http_proxy": proxy, "NO_PROXY": "", "no_proxy": ""}
    try:
        subprocess.run([str(work / "chisel-wrapper"), "--generate-dpkg-status",
                        str(root / "var/lib/dpkg/status"), "--", "--release", str(release),
                        "--root", str(root), *slices], check=True, env=environment)
    finally:
        server.shutdown()
    if errors or records != lock["snapshotInputs"]:
        raise ValueError("Snapshot fetch set differs from lock: " + repr(errors))
    installed = parse_controls((root / "var/lib/dpkg/status").read_text())
    downloaded = []
    for relative, text in controls.items():
        fields = parse_controls(text)
        if len(fields) != 1:
            raise ValueError("Ambiguous deb control")
        fields[0]["path"] = relative
        fields[0]["bytes"], fields[0]["sha256"] = records[relative]
        downloaded.extend(fields)
    downloaded.sort(key=lambda entry: entry["package"])
    if downloaded != lock["packages"]:
        raise ValueError("Downloaded package identities differ from lock")
    expected = [{k: p[k] for k in ("package", "version", "architecture", "source")}
                for p in lock["packages"]]
    if sorted(installed, key=lambda entry: entry["package"]) != expected:
        raise ValueError("Installed dpkg identities differ from authenticated packages")
    (proof / "snapshot-inputs.json").write_text(json.dumps(records, sort_keys=True, indent=2) + "\n")
    (proof / "package-lock.json").write_text(json.dumps(downloaded, indent=2) + "\n")
    (root / "usr/bin").mkdir(parents=True, exist_ok=True)
    (root / "usr/bin/dotnet").symlink_to("/usr/share/dotnet/dotnet")


def parse_controls(text):
    controls = []
    for stanza in text.strip().split("\n\n"):
        fields = {}
        for line in stanza.splitlines():
            if ":" in line and not line.startswith(" "):
                key, value = line.split(":", 1)
                fields[key] = value.strip()
        if "Package" in fields:
            controls.append({"package": fields["Package"], "version": fields["Version"],
                             "architecture": fields["Architecture"],
                             "source": fields.get("Source", fields["Package"])})
    return controls


def main(path):
    lock = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if lock["schemaVersion"] != 1:
        raise ValueError("Unsupported runtime lock")
    snapshot_url(lock["snapshot"])
    proof = Path("/proof")
    proof.mkdir()
    shutil.copy(path, proof / "runtime-inputs.json")
    shutil.copy(__file__, proof / "build-kiota-runtime.py")
    with tempfile.TemporaryDirectory() as temporary:
        work = Path(temporary)
        ca = Path("/run/secrets/nuget_ca")
        if ca.exists():
            default_ca = Path(ssl.get_default_verify_paths().cafile)
            combined = work / "ca.pem"
            combined.write_bytes(default_ca.read_bytes() + b"\n" + ca.read_bytes())
            os.environ["SSL_CERT_FILE"] = str(combined)
        release = prepare_tools(lock, work, proof)
        cut_rootfs(lock, work, proof, release)


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        unittest.main(argv=[sys.argv[0]], verbosity=2)
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        raise SystemExit("Usage: build-kiota-runtime.py --self-test | lock.json")
