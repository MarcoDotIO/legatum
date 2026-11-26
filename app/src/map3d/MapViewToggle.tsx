// The 3D / 2D map switch: a small tab over the minimap's top-left corner (the collapse tab holds the
// top-right), like Civ 6's strategic-view button beside its minimap. Only shown where 3D can run.
import { useState } from 'react';
import { useGame } from '../store';
import { canUse3d, needsFlatMap, useMapView } from './mapPrefs';

export function MapViewToggle() {
  const [can3d] = useState(canUse3d);
  const kind = useMapView((m) => m.kind);
  const picking = useGame(needsFlatMap);
  if (!can3d || picking) return null; // a tile picker holds the 2D map until it closes
  const to = kind === '3d' ? '2D' : '3D';
  return (
    <button type="button" className="minimap-toggle map-view-toggle" aria-label={`Show the ${to} map (M)`} title={`Show the ${to} map (M)`}
      onClick={() => useMapView.getState().toggle()}>
      {kind === '3d' ? '2D' : '3D'}
    </button>
  );
}
