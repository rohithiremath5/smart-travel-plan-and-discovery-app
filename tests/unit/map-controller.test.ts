import { describe, it, expect, vi } from 'vitest';
import type { Map as LibreMap, Marker } from 'maplibre-gl';
import { MapController } from '@/features/mapping/services/map-controller';
import type { MapMarker } from '@/features/mapping/domain/map';
function setup() {
  const handlers = new Map<string, () => void>();
  const source = { setData: vi.fn() };
  let hasSource = false;
  const map = {
    on: vi.fn((event: string, handler: () => void) => handlers.set(event, handler)),
    off: vi.fn(),
    easeTo: vi.fn(),
    jumpTo: vi.fn(),
    fitBounds: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
    getSource: vi.fn(() => (hasSource ? source : undefined)),
    addSource: vi.fn(() => {
      hasSource = true;
    }),
    addLayer: vi.fn(),
  };
  const markers: {
    element: HTMLElement;
    setLngLat: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  }[] = [];
  const markerFactory = vi.fn((element: HTMLElement) => {
    const marker = {
      element,
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    };
    markers.push(marker);
    return marker as unknown as Marker;
  });
  const select = vi.fn();
  const controller = new MapController(
    { map: map as unknown as LibreMap, marker: markerFactory },
    select,
  );
  return { controller, map, markers, select, handlers, source, markerFactory };
}
const points: MapMarker[] = [
  {
    id: 'a',
    label: 'A user place',
    coordinates: { latitude: 35, longitude: 135 },
    kind: 'activity',
    order: 1,
  },
  {
    id: 'b',
    label: 'Another place',
    coordinates: { latitude: 35.01, longitude: 135.02 },
    kind: 'activity',
    order: 2,
  },
];
describe('MapLibre controller lifecycle and synchronization', () => {
  it('fits nearby markers across the antimeridian without treating them as a world-wide span', () => {
    const { controller, map } = setup();
    controller.update([
      { ...points[0]!, coordinates: { latitude: 0, longitude: 179.99 } },
      { ...points[1]!, coordinates: { latitude: 0.01, longitude: -179.99 } },
    ]);
    controller.fit();
    const bounds = map.fitBounds.mock.calls[0]![0] as number[][];
    expect(bounds[1]![0]! - bounds[0]![0]!).toBeLessThan(1);
    controller.destroy();
  });
  it('creates stable accessible markers with explicit longitude/latitude conversion and no HTML injection', () => {
    const { controller, markers, select, markerFactory } = setup();
    controller.update(points);
    expect(markerFactory).toHaveBeenCalledTimes(2);
    expect(markers[0]!.setLngLat).toHaveBeenCalledWith([135, 35]);
    expect(markers[0]!.element.getAttribute('aria-label')).toBe('Map activity 1: A user place');
    markers[0]!.element.click();
    expect(select).toHaveBeenCalledWith('a');
    controller.update([
      { ...points[0]!, label: '<img src=x onerror=alert(1)>', order: 2 },
      points[1]!,
    ]);
    expect(markerFactory).toHaveBeenCalledTimes(2);
    expect(markers[0]!.element.querySelector('img')).toBeNull();
    controller.destroy();
  });
  it('selects a marker without changing itinerary order and cleans old-day markers/listeners', () => {
    const { controller, map, markers, select } = setup();
    controller.update(points);
    controller.selectMarker('b');
    expect(markers[1]!.element.getAttribute('aria-pressed')).toBe('true');
    expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [135.02, 35.01] }));
    controller.fit();
    expect(map.fitBounds).toHaveBeenCalledOnce();
    controller.update([points[1]!]);
    expect(markers[0]!.remove).toHaveBeenCalledOnce();
    markers[0]!.element.click();
    expect(select).not.toHaveBeenCalled();
    controller.resize();
    expect(map.resize).toHaveBeenCalledOnce();
    controller.destroy();
    expect(map.off).toHaveBeenCalledWith('load', expect.any(Function));
    expect(map.remove).toHaveBeenCalledOnce();
    expect(markers[1]!.remove).toHaveBeenCalledOnce();
  });
  it('waits for style load, clears route data and rejects invalid marker coordinates', () => {
    const { controller, map, handlers, source, markerFactory } = setup();
    controller.update([{ ...points[0]!, coordinates: { latitude: 91, longitude: 0 } }]);
    expect(markerFactory).not.toHaveBeenCalled();
    controller.setRoute({
      mode: 'walk',
      distanceMeters: 100,
      durationSeconds: 60,
      source: 'geoapify',
      waypoints: points.map((p) => p.coordinates),
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [135, 35],
            [135.02, 35.01],
          ],
        ],
      },
    });
    expect(map.addSource).not.toHaveBeenCalled();
    handlers.get('load')!();
    expect(map.addLayer).toHaveBeenCalledTimes(2);
    controller.setRoute(null);
    expect(source.setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] });
    controller.destroy();
  });
});
