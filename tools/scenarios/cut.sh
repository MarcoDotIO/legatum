#!/usr/bin/env bash
# Cut an AI measurement position from a save and measure Hard from that start.
#   tools/scenarios/cut.sh SAVE --inspect [--from A] [--to B]
#   tools/scenarios/cut.sh --state STATE.json --seat K --id ID --title TEXT --objective SPEC --turns N
#   tools/scenarios/cut.sh SAVE --turn N --seat K --id ID --title TEXT --objective SPEC --turns N
#       [--runs 50] [--replace] [--allow-mismatch] [--no-baseline] [--local]
# See scenarios/README.md. The save is only read.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
here="$(cd "$(dirname "$0")" && pwd)"

die() { echo "cut.sh: $*" >&2; exit 2; }
[ $# -ge 1 ] || { sed -n '2,/^set -euo/p' "$0" | sed '$d;s/^# \{0,1\}//'; exit 2; }
case "$1" in -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d;s/^# \{0,1\}//'; exit 0;; esac
save=""; state=""
if [ "$1" = "--state" ]; then
  state="${2:?--state needs a state file}"; shift 2
  [ -f "$state" ] || die "no such state file: $state"
else
  save="$1"; shift
  [ -f "$save" ] || die "no such save: $save"
fi

cut_args=(); id=""; runs=50; baseline=1; local_run=0; inspect=0
while [ $# -gt 0 ]; do
  case "$1" in
    --inspect) inspect=1; cut_args+=("$1"); shift;;
    --id) id="${2:?--id needs a value}"; cut_args+=("$1" "$2"); shift 2;;
    --runs) runs="${2:?}"; shift 2;;
    --no-baseline) baseline=0; shift;;
    --local) local_run=1; shift;;
    --replace|--allow-mismatch) cut_args+=("$1"); shift;;
    --turn|--seat|--title|--briefing|--rusher|--war|--storm|--rush-target|--objective|--turns|--from|--to)
      [ $# -ge 2 ] || die "$1 needs a value"; cut_args+=("$1" "$2"); shift 2;;
    *) die "unknown option $1";;
  esac
done
if [ "$inspect" = 0 ]; then
  [ -n "$id" ] || die "--id is required"
  case "$id" in *[!a-z0-9-]*) die "--id may use lowercase letters, digits and dashes only";; esac
fi

rel=".cut-tmp/run-$$"
work="$root/$rel"
mkdir -p "$work"
trap 'rm -rf "$work"; rmdir "$root/.cut-tmp" 2>/dev/null || true' EXIT
[ -z "$save" ] || cp "$save" "$work/save.legatum"
[ -z "$state" ] || cp "$state" "$work/state.json"

{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  printf 'cargo run -q --release -p legatum-sim -- scenario-cut'
  [ -z "$save" ] || printf " --save $rel/save.legatum"
  [ -z "$state" ] || printf " --state $rel/state.json"
  for a in ${cut_args[@]+"${cut_args[@]}"}; do printf ' %q' "$a"; done
  echo
  if [ "$inspect" = 0 ] && [ "$baseline" = 1 ]; then
    printf 'cargo run -q --release -p legatum-sim -- scenario %q --runs %q --difficulty hard --threads 16 --record\n' "scenarios/lab/$id.json" "$runs"
  fi
} > "$work/run.sh"

if [ "$local_run" = 1 ]; then
  renice 15 -p $$ >/dev/null 2>&1 || true
  (cd "$root" && bash "$rel/run.sh")
  echo "cut.sh: done locally"
else
  artifacts=()
  if [ "$inspect" = 0 ]; then
    artifacts+=(--artifact "scenarios/lab/$id.json")
    [ "$baseline" = 1 ] && artifacts+=(--artifact "docs/sim-results/scenarios/$id-baseline.json" --artifact "docs/sim-results/scenarios/$id-baseline.md")
  fi
  "$root/tools/cloud/remote.sh" "$root" --with-uncommitted --label "cut-${id:-inspect}" --artifact-dir "$work/out" ${artifacts[@]+"${artifacts[@]}"} -- bash "$rel/run.sh"
  if [ "$inspect" = 0 ]; then
    mkdir -p "$root/scenarios/lab" "$root/docs/sim-results/scenarios"
    cp "$work/out/scenarios/lab/$id.json" "$root/scenarios/lab/$id.json"
    if [ "$baseline" = 1 ]; then
      cp "$work/out/docs/sim-results/scenarios/$id-baseline.json" "$work/out/docs/sim-results/scenarios/$id-baseline.md" "$root/docs/sim-results/scenarios/"
    fi
  fi
fi

if [ "$inspect" = 0 ]; then
  if [ "$baseline" = 1 ]; then
    measured_commit="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("engine_commit", "unknown"))' "$root/docs/sim-results/scenarios/$id-baseline.json")"
    python3 "$root/tools/sim/freshness.py" stamp --commit "$measured_commit" \
      "docs/sim-results/scenarios/$id-baseline.json" "docs/sim-results/scenarios/$id-baseline.md"
  fi
  python3 - "$root/scenarios/lab/$id.json" <<'PY'
import json, sys
f = json.load(open(sys.argv[1]))
b = f.get("baseline")
print(f"cut.sh: {f['id']} r{f['revision']} written; {f['faction']} seat {f['seat']}; objective: {f['objective']['summary']}")
if b:
    print(f"cut.sh: Hard AI over {b['runs']} runs: median score {b['median']}, met {b.get('win_percent')}%, median turns {b.get('median_turns')}")
else:
    print("cut.sh: no baseline recorded (--no-baseline or the run failed)")
print("cut.sh: commit scenarios/lab/ and docs/sim-results/scenarios/.")
PY
fi
