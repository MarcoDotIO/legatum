# AI measurement positions

The JSON files here are start positions for measuring the AI. They are not playable from the game. The `lab/` folder and its position IDs remain because AI genes and reports refer to them by ID; `war/` contains short wars cut from recorded games. Root-level positions serve simulator and engine tests.

Each `legatum-scenario` file contains an encoded game state with a checked state hash, an objective, scoring rules and optional AI memory or a scripted rusher. `crates/wasm/src/scenario.rs` reads the format; `crates/core/src/scenario.rs` scores objectives. The format stays at version 1. The historical `minutes` and briefing fields remain for compatibility, but no player card or feedback is used.

## Cut a position from a save

```sh
tools/scenarios/cut.sh SAVE.legatum --inspect --from 5 --to 40
tools/scenarios/cut.sh SAVE.legatum --turn 10 --seat Mongols \
  --id mongol-hold-the-line --title "Hold the Line" --objective hold --turns 20
```

`--seat` names the empire whose AI is measured. `--objective` accepts `hold`, `take:City[+City]`, `eliminate:Empire[+Empire]`, `cities:N` or `score`. `--rusher`, `--war`, `--storm` and `--rush-target` configure a scripted attacking empire. `--replace` increments a position's revision. The command reads the save and writes `scenarios/lab/<id>.json`; by default it also records a Hard baseline in `docs/sim-results/scenarios/`.

For an older save, `tools/scenarios/extract-state.sh SAVE --out DIR --turns N` replays it on its original engine. Then cut the extracted state with `tools/scenarios/cut.sh --state DIR/TN.json --seat K ...`.

Run `legatum-sim scenario scenarios/lab/<id>.json --runs 50 --difficulty hard` for an AI baseline, `tools/sim/war-scenarios.sh` for the war suite, and `tools/sim/scenario-gate.sh` for paired AI comparisons. `tools/sim/nightly_scenarios.py` selects all files in `lab/` by folder. A branch that changes only `scenarios/lab/*.json` and accompanying documentation gets the fast position check in `tools/gates/scenario.py`: it checks shape, rules version, state hash, legality and objective parsing. No title-screen list or human run file is involved.

Keep positions that measure a current AI gap. When a position depends on removed rules, is saturated, duplicates another gap or starts after the deciding choice, remove it and its baseline together. Historical reports remain as records of past measurements.
