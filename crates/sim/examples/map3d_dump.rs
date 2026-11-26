//! Prototype helper for the 3D map: play an all-AI standard game for N turns and write
//! seat 0's PlayerView (fogged) as JSON. Usage: map3d_dump <seed> <turns> <out.json>
use legatum_core::state::GameSetup;
use legatum_core::types::Faction;
use legatum_core::view::player_view;
use legatum_wasm::session::{BrainKind, Session};

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let seed: u64 = a.get(1).map(|s| s.parse().unwrap()).unwrap_or(7);
    let turns: u32 = a.get(2).map(|s| s.parse().unwrap()).unwrap_or(100);
    let out = a.get(3).cloned().unwrap_or("view.json".into());
    let mut setup = GameSetup::standard(seed, [Faction::India, Faction::Egypt]);
    for p in &mut setup.players {
        p.difficulty = legatum_core::state::AiDifficulty::Hard;
        p.is_human = false;
    }
    let mut s = Session::new(&setup, |_| BrainKind::Scripted);
    for _ in 0..turns {
        let o = s.ai_orders();
        s.step(&o);
    }
    // Seat with the most cities: its fogged view, plus the full state for the prototype's omniscient mode.
    let best = (0..s.state.players.len() as u8)
        .max_by_key(|&p| {
            s.state
                .cities
                .iter()
                .filter(|c| c.1.owner == legatum_core::PlayerId(p))
                .count()
        })
        .unwrap();
    let v = player_view(&s.state, legatum_core::PlayerId(best));
    std::fs::write(&out, serde_json::to_string(&v).unwrap()).unwrap();
    std::fs::write(
        format!("{out}.state.json"),
        serde_json::to_string(&s.state).unwrap(),
    )
    .unwrap();
    // Hand seat 0 back to a human so the app opens the save as a playable game.
    s.state.setup.players[0].is_human = true;
    s.state.players[0].is_human = true;
    let save = s.save_json();
    std::fs::write(format!("{out}.save.json"), save).unwrap();
    eprintln!("seat {best}");
    eprintln!("turn {} written to {out}", s.state.turn);
}
