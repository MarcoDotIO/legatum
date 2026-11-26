#!/usr/bin/env python3
"""Fast gate for branches containing only AI measurement positions in scenarios/lab/.

Checks the scenario file's shape, rules version and state hash on the current engine.
No player card, copy lint or human run is required.
"""
import base64
import gzip
import json
import os
import re
import shlex
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import git  # noqa: E402

LAB = re.compile(r"^scenarios/lab/([a-z0-9-]+)\.json$")
RULES = re.compile(r"pub const RULES_VERSION:\s*u32\s*=\s*(\d+)\s*;")


def main_checkout(repo):
    common = git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir")
    return os.path.dirname(common.strip()) if common else repo


def master_checkout(repo):
    """The checkout whose engine is master's: this one when it is on master, else the main checkout."""
    if os.environ.get("LEGATUM_SCENARIO_ROOT"):
        return os.environ["LEGATUM_SCENARIO_ROOT"]
    top = (git(repo, "rev-parse", "--show-toplevel") or repo).strip()
    return top if (git(repo, "symbolic-ref", "--short", "-q", "HEAD") or "").strip() == "master" else main_checkout(repo)


def rules_version_of(lib_rs_text):
    m = RULES.search(lib_rs_text or "")
    return int(m.group(1)) if m else None


def master_rules_version(repo):
    return rules_version_of(git(repo, "show", "refs/heads/master:crates/core/src/lib.rs"))


def state_save_version(state):
    """The `save_version` inside a scenario's encoded state, or raise ValueError with the reason."""
    enc, data = state.get("encoding"), state.get("data")
    if not isinstance(data, str):
        raise ValueError("the state has no data")
    try:
        if enc == "json":
            raw = data
        elif enc == "gzip-base64":
            raw = gzip.decompress(base64.b64decode(data)).decode("utf-8")
        else:
            raise ValueError(f"unknown state encoding {enc!r}")
        v = json.loads(raw).get("save_version")
    except ValueError:
        raise
    except Exception as e:  # noqa: BLE001 - any decode failure is a reason, not a crash
        raise ValueError(f"the state cannot be decoded: {e}")
    return v


def shape_findings(label, text, rules_version, file_id=None):
    """[reason] for one scenario file's text: its shape and rules version (no engine). FILE_ID is the id the file
    name promises (None: not checked)."""
    try:
        d = json.loads(text)
    except ValueError as e:
        return [f"{label}: not valid JSON ({e})"]
    if not isinstance(d, dict):
        return [f"{label}: not a JSON object"]
    out = []
    if d.get("format") != "legatum-scenario" or d.get("version") != 1:
        return [f"{label}: format is {d.get('format')!r} version {d.get('version')!r}, not legatum-scenario 1"]
    if file_id is not None and d.get("id") != file_id:
        out.append(f"{label}: id {d.get('id')!r} does not match the file name ({file_id})")
    if not d.get("title"):
        out.append(f"{label}: missing title")
    obj = d.get("objective")
    if not isinstance(obj, dict) or not obj.get("summary") or not obj.get("turns") or not obj.get("score"):
        out.append(f"{label}: objective needs a summary, a turn window and a score")
    state = d.get("state")
    if not isinstance(state, dict) or not re.fullmatch(r"\d+", str(state.get("hash", ""))):
        out.append(f"{label}: no state with a hash")
    else:
        try:
            v = state_save_version(state)
            if v != rules_version:
                out.append(f"{label}: made for rules version {v}; the engine is {rules_version}"
                           + (" (re-cut it: tools/scenarios/cut.sh --replace)" if rules_version else ""))
        except ValueError as e:
            out.append(f"{label}: {e}")
    return out


def engine_command(root):
    """Argv to run `scenario-check` on master's engine in checkout ROOT, building it first (no-op when current)."""
    override = os.environ.get("LEGATUM_SCENARIO_ENGINE")
    if override:
        return shlex.split(override), None
    return [os.path.join(root, "target", "release", "legatum-sim"), "scenario-check"], \
        [os.path.join(root, "tools", "sim", "build-slot.sh"), "--", "cargo", "build", "-q", "--release", "-p", "legatum-sim"]


def engine_findings(root, paths):
    """[reason] from `legatum-sim scenario-check PATHS` (path -> label in the reply is the path itself)."""
    argv, build = engine_command(root)
    try:
        if build:
            b = subprocess.run(build, cwd=root, capture_output=True, text=True, timeout=1800)
            if b.returncode != 0:
                return [f"[engine] cannot build legatum-sim in {root}: {(b.stderr or b.stdout).strip()[-300:]}"]
        r = subprocess.run([*argv, *paths], cwd=root, capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        return [f"[engine] the scenario check could not run: {e}"]
    out = []
    for line in r.stdout.splitlines():
        if line.startswith("FAIL\t"):
            _, path, reason = (line.split("\t") + ["", ""])[:3]
            out.append(f"{os.path.basename(path)}: does not load on master's engine ({reason})")
    if r.returncode != 0 and not out:
        out.append(f"[engine] the scenario check failed: {(r.stderr or r.stdout).strip()[-300:]}")
    return out


def check_files(root, files, rules_version, engine=True):
    """[finding] for FILES ({label: path on disk}) against RULES_VERSION: shape, then the engine
    on the files whose shape is sound. ENGINE False skips the engine load (a rules version other than the
    checkout's)."""
    findings, sound = [], []
    for label, path in files.items():
        path = os.path.abspath(path)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        mine = shape_findings(label, text, rules_version, file_id=re.sub(r"\.json$", "", label))
        findings += mine
        if not mine:
            sound.append(path)
    if sound and engine:
        findings += engine_findings(root, sound)
    return findings


def check(repo, tip, files):
    """[finding] for a scenario-only branch: FILES are the `scenarios/lab/*.json` paths it changes, read at TIP
    (a deleted file is skipped). The rules version is master's; the engine is the merging checkout's."""
    import tempfile
    from common import cat_files
    version = master_rules_version(repo)
    if version is None:
        return ["[scenario] cannot read RULES_VERSION from crates/core/src/lib.rs on master"]
    tmp = tempfile.mkdtemp(prefix="legatum-scenario-gate-")
    try:
        paths, findings = {}, []
        for path, data in cat_files(repo, tip, files):
            label = os.path.basename(path)
            out = os.path.join(tmp, label)
            with open(out, "wb") as f:
                f.write(data)
            paths[label] = out
        return findings + check_files(master_checkout(repo), paths, version)
    finally:
        import shutil
        shutil.rmtree(tmp, ignore_errors=True)


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    repo = "."
    if args[:1] == ["--repo"]:
        repo, args = args[1], args[2:]
    if not args:
        print(__doc__)
        return 2
    version = master_rules_version(repo)
    root = master_checkout(repo)
    findings = check_files(root, {os.path.basename(p): p for p in args}, version)
    for f in findings:
        print(f)
    print(f"scenario check: {'PASS' if not findings else 'FAIL'} ({len(args)} files, rules version {version})")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
