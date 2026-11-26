## 2026-11-22: Era research browser fixtures follow World Age announcements

- The research gate has eight later-era rows after Ancient (nine eras total). `era-research.spec.ts` now derives their count, ordered names and technology counts from the engine-exported data instead of expecting six.
- `EraNotice` intentionally skips `EraEntered` events with `first: true`: the World Age score check announces the opener. The rival-banner fixture must use `first: false`; its assertion now also pins the faction label (`Mongols`), rather than the seat name. The missing banner was a stale fixture, not a toast timing bug.
