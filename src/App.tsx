import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Shell only for now. React owns the panel; MapLibre and the simulation loop
 * live in refs so a 60 fps loop never round-trips through React state.
 * Phase 1 replaces the placeholder map div with the real map.
 */
export function App(): JSX.Element {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState('scaffold');

  useEffect(() => {
    // Phase 1 mounts MapLibre here.
    if (!mapNode.current) return;
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <main>
      <div ref={mapNode} className="map" />
      <aside className="panel">
        <h1>Vellam</h1>
        <p className="status">{status}</p>
        <button type="button" onClick={() => setStatus('ready')}>
          Placeholder
        </button>
      </aside>
    </main>
  );
}
