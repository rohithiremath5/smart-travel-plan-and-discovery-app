import { useEffect, useRef, useState } from 'react';
import { Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';
import { MapController } from '../services/map-controller';
import { toLngLat, type MapMarker, type MapRoute } from '../domain/map';
setWorkerUrl(workerUrl);
export default function MapCanvas({
  markers,
  selected,
  route,
  select,
}: {
  markers: MapMarker[];
  selected: string | null;
  route: MapRoute | null;
  select: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<MapController | null>(null);
  const latest = useRef({ markers, selected, route, select });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    latest.current = { markers, selected, route, select };
    controller.current?.update(markers);
    controller.current?.selectMarker(selected);
    controller.current?.setRoute(route);
  }, [markers, selected, route, select]);
  const fitSignature = markers
    .map((marker) => `${marker.id}:${marker.coordinates.latitude}:${marker.coordinates.longitude}`)
    .join('|');
  useEffect(() => {
    controller.current?.fit();
  }, [fitSignature]);
  useEffect(() => {
    if (!container.current) return;
    let alive = true;
    let map: Map | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    const timer = setTimeout(() => {
      if (alive) setState('error');
    }, 15000);
    try {
      map = new Map({
        container: container.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: latest.current.markers[0]
          ? toLngLat(latest.current.markers[0].coordinates)
          : [0, 20],
        zoom: latest.current.markers.length ? 11 : 1.5,
        maxZoom: 18,
        minZoom: 1,
        renderWorldCopies: false,
        cooperativeGestures: true,
        attributionControl: { compact: false },
        transformRequest: (url) => {
          const target = new URL(url, location.origin);
          if (!['tiles.openfreemap.org', location.hostname].includes(target.hostname))
            throw new Error('Map source unavailable');
          return { url, credentials: 'same-origin' };
        },
      });
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      const onLoad = () => {
        clearTimeout(timer);
        if (alive) setState('ready');
      };
      const onError = () => {
        if (alive) setState('error');
      };
      map.on('load', onLoad);
      map.on('error', onError);
      controller.current = new MapController(
        { map, marker: (element) => new Marker({ element, anchor: 'bottom' }) },
        (id) => latest.current.select(id),
      );
      controller.current.update(latest.current.markers);
      controller.current.selectMarker(latest.current.selected);
      controller.current.setRoute(latest.current.route);
      controller.current.fit();
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => controller.current?.resize());
      });
      observer.observe(container.current);
      return () => {
        alive = false;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        observer?.disconnect();
        map?.off('load', onLoad);
        map?.off('error', onError);
        controller.current?.destroy();
        controller.current = null;
      };
    } catch {
      queueMicrotask(() => {
        if (alive) setState('error');
      });
      return () => {
        alive = false;
        clearTimeout(timer);
        observer?.disconnect();
        map?.remove();
      };
    }
  }, [attempt]);
  return (
    <div className="map-frame">
      <div className="map-surface" ref={container} aria-label="Interactive day map" />
      {state === 'loading' && (
        <p className="map-state" role="status">
          Opening the map…
        </p>
      )}
      {state === 'error' && (
        <div className="map-state map-failure" role="alert">
          <strong>The basemap is unavailable.</strong>
          <p>
            WebGL, tiles or your connection may be unavailable. Your itinerary and location list
            still work.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Retry map
          </Button>
        </div>
      )}
      <Button
        className="map-fit"
        variant="secondary"
        disabled={!markers.length}
        onClick={() => controller.current?.fit()}
      >
        Fit all places
      </Button>
      <span className="map-health sr-only">
        {state === 'ready'
          ? 'Basemap loaded'
          : state === 'error'
            ? 'Basemap unavailable'
            : 'Basemap loading'}
      </span>
    </div>
  );
}
