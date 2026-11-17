"""Serve only the authenticated amd64 Ubuntu archive paths from the locked snapshot."""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

snapshot = "https://snapshot.ubuntu.com/ubuntu/20261116T000000Z/"
proof = pathlib.Path("/proof")
proof.mkdir(exist_ok=True)
records = {}
lock = threading.Lock()


class SnapshotHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlsplit(self.path)
        if (path.hostname != "archive.ubuntu.com" or path.scheme != "http" or
                not path.path.startswith(("/ubuntu/dists/", "/ubuntu/pool/")) or
                ".." in path.path or path.query or path.fragment):
            self.send_error(403, "request outside pinned Ubuntu archive")
            return
        relative = path.path.removeprefix("/ubuntu/")
        try:
            with urllib.request.urlopen(snapshot + relative, timeout=120) as res, tempfile.TemporaryFile() as f:
                digest = hashlib.sha256()
                while chunk := res.read(1024 * 1024):
                    digest.update(chunk)
                    f.write(chunk)
                size = f.tell()
                f.seek(0)
                with lock:
                    identity = [size, digest.hexdigest()]
                    if relative in records and records[relative] != identity:
                        raise ValueError("snapshot input changed: " + relative)
                    records[relative] = identity
                    if relative.endswith("/InRelease"):
                        (proof / relative.replace("/", "_")).write_bytes(f.read())
                        f.seek(0)
                self.send_response(200)
                self.send_header("Content-Length", str(size))
                self.end_headers()
                shutil.copyfileobj(f, self.wfile)
        except urllib.error.HTTPError as err:
            self.send_error(err.code)


server = ThreadingHTTPServer(("127.0.0.1", 0), SnapshotHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
proxy = f"http://127.0.0.1:{server.server_port}"
root = pathlib.Path("/rootfs")
(root / "var/lib/dpkg").mkdir(parents=True)
slices = """base-files_base base-files_chisel base-files_release-info ca-certificates_data
libc6_libs libgcc-s1_libs libicu74_libs libssl3t64_libs libstdc++6_libs
tzdata-legacy_zoneinfo tzdata_zoneinfo""".split()
subprocess.run(["/usr/local/bin/chisel-wrapper", "--generate-dpkg-status", str(root / "var/lib/dpkg/status"),
                "--", "--release", "/slices", "--root", str(root), *slices], check=True,
               env={**os.environ, "HTTP_PROXY": proxy, "http_proxy": proxy, "NO_PROXY": "", "no_proxy": ""})
assert all("dists/" + suite + "/InRelease" in records for suite in ("noble", "noble-security", "noble-updates"))
assert any(name.endswith("libc6_2.39-0ubuntu8.12_amd64.deb") for name in records)
(proof / "snapshot-inputs.json").write_text(json.dumps(records, sort_keys=True, indent=2) + "\n")
