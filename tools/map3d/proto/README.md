# 3D map prototype (throwaway)

First real-time 3D look at Legatum's map with three.js, from a real game state. Not shipped; stage 1 of the
3D map plan rebuilds this properly as `app/src/map3d/`.

1. `cargo run --release -p legatum-sim --example map3d_dump -- 7 110 view.json` (all-AI game, 110 turns; writes the
   fogged view of the seat with most cities plus `view.json.state.json`).
2. `python3 extract.py` (run beside `view.json`) writes `site/data.json`.
3. Put a stand-in `site/CesiumMan.glb` (Khronos glTF sample, CC BY 4.0, not committed), `npm i three@0.170.0`,
   then `python3 build.py local index.html` (local three) or `python3 build.py cdn out.html` (jsDelivr).
