import { coordinates, toLngLat, type MapMarker, type MapRoute } from '../domain/map';
import type { Map as LibreMap, Marker as LibreMarker, GeoJSONSource } from 'maplibre-gl';
export interface MapRuntime {
  map: LibreMap;
  marker: (element: HTMLElement) => LibreMarker;
}
export class MapController {
  private markers = new Map<
    string,
    { marker: LibreMarker; button: HTMLButtonElement; remove: () => void }
  >();
  private points: MapMarker[] = [];
  private selected: string | null = null;
  private route: MapRoute | null = null;
  private ready = false;
  constructor(
    private runtime: MapRuntime,
    private select: (id: string) => void,
  ) {
    this.runtime.map.on('load', this.loaded);
  }
  private loaded = () => {
    this.ready = true;
    this.drawRoute();
  };
  update(points: MapMarker[]) {
    this.points = points.filter((point) => coordinates(point.coordinates));
    const ids = new Set(this.points.map((point) => point.id));
    for (const [id, item] of this.markers)
      if (!ids.has(id)) {
        item.remove();
        item.marker.remove();
        this.markers.delete(id);
      }
    for (const point of this.points) {
      let item = this.markers.get(point.id);
      if (!item) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'travel-map-marker';
        const click = () => this.select(point.id);
        button.addEventListener('click', click);
        const marker = this.runtime
          .marker(button)
          .setLngLat(toLngLat(point.coordinates))
          .addTo(this.runtime.map);
        item = { marker, button, remove: () => button.removeEventListener('click', click) };
        this.markers.set(point.id, item);
      }
      item.marker.setLngLat(toLngLat(point.coordinates));
      item.button.textContent = point.kind === 'destination' ? 'D' : String(point.order);
      item.button.setAttribute(
        'aria-label',
        point.kind === 'destination'
          ? `Destination: ${point.label}`
          : `Map activity ${point.order}: ${point.label}`,
      );
      item.button.title = point.label;
      item.button.dataset.kind = point.kind;
      item.button.setAttribute('aria-pressed', String(point.id === this.selected));
      item.button.style.zIndex = point.id === this.selected ? '10' : '1';
    }
  }
  selectMarker(id: string | null) {
    const previous = this.selected;
    this.selected = id;
    for (const [key, item] of this.markers) {
      item.button.setAttribute('aria-pressed', String(key === id));
      item.button.style.zIndex = key === id ? '10' : '1';
    }
    const point = this.points.find((p) => p.id === id);
    if (point && previous !== id)
      this.runtime.map.easeTo({
        center: toLngLat(point.coordinates),
        duration: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
      });
  }
  fit() {
    if (!this.points.length) return;
    const raw = [
      ...this.points.map((p) => toLngLat(p.coordinates)),
      ...(this.route?.geometry.coordinates.flat() ?? []),
    ];
    const origin = raw[0]![0];
    const positions = raw.map(([longitude, latitude]) => {
      while (longitude - origin > 180) longitude -= 360;
      while (longitude - origin < -180) longitude += 360;
      return [longitude, latitude] as [number, number];
    });
    const first = positions[0]!;
    if (positions.length === 1) {
      this.runtime.map.jumpTo({ center: first, zoom: 12 });
      return;
    }
    this.runtime.map.fitBounds(
      [
        [Math.min(...positions.map((p) => p[0])), Math.min(...positions.map((p) => p[1]))],
        [Math.max(...positions.map((p) => p[0])), Math.max(...positions.map((p) => p[1]))],
      ],
      { padding: 64, maxZoom: 15, duration: 0 },
    );
  }
  setRoute(route: MapRoute | null) {
    const changed = route !== this.route;
    this.route = route;
    if (this.ready) this.drawRoute();
    if (changed && route) this.fit();
  }
  private drawRoute() {
    const data = {
      type: 'FeatureCollection' as const,
      features: this.route
        ? [{ type: 'Feature' as const, properties: {}, geometry: this.route.geometry }]
        : [],
    };
    const source = this.runtime.map.getSource('day-route') as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    this.runtime.map.addSource('day-route', { type: 'geojson', data });
    this.runtime.map.addLayer({
      id: 'day-route-casing',
      type: 'line',
      source: 'day-route',
      paint: { 'line-color': '#ffffff', 'line-width': 8 },
    });
    this.runtime.map.addLayer({
      id: 'day-route-line',
      type: 'line',
      source: 'day-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#0b6764', 'line-width': 4 },
    });
  }
  resize() {
    this.runtime.map.resize();
  }
  destroy() {
    this.runtime.map.off('load', this.loaded);
    for (const item of this.markers.values()) {
      item.remove();
      item.marker.remove();
    }
    this.markers.clear();
    this.runtime.map.remove();
  }
}
