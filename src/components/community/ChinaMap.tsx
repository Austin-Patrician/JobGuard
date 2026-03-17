"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCommunityStore } from "@/stores";
import type { RegionStat } from "@/types/community";
import { toShortName } from "@/data/region-name-map";
import { createBaseStyle, LIGHT_COLORS, DARK_COLORS } from "@/lib/map-style";

const INITIAL_VIEW = {
  longitude: 104.5,
  latitude: 35.5,
  zoom: 3.5,
};

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [70, 2],
  [145, 58],
];

function getColorTier(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface ChinaMapProps {
  regions: RegionStat[];
}

function walkCoordinates(
  coords: unknown,
  cb: (lng: number, lat: number) => void,
) {
  if (!Array.isArray(coords)) return;
  if (coords.length === 0) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    cb(coords[0] as number, coords[1] as number);
    return;
  }
  for (const child of coords) {
    walkCoordinates(child, cb);
  }
}

function getGeoBounds(
  geo: GeoJSON.FeatureCollection | null,
): [[number, number], [number, number]] | null {
  if (!geo) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feature of geo.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    walkCoordinates(geometry.coordinates, (lng, lat) => {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    });
  }

  if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
    return null;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function ChinaMap({ regions }: ChinaMapProps) {
  const mapRef = useRef<MapRef>(null);
  const hasFittedRef = useRef(false);
  const isMapLoadedRef = useRef(false);
  const lastSelectedRef = useRef<string | null>(null);
  const selectedRegion = useCommunityStore((s) => s.selectedRegion);
  const setSelectedRegion = useCommunityStore((s) => s.setSelectedRegion);
  const [hovered, setHovered] = useState<{
    name: string;
    count: number;
    tags: string[];
    x: number;
    y: number;
  } | null>(null);
  const [geoData, setGeoData] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const regionLookup = useMemo(() => {
    const m = new Map<string, RegionStat>();
    for (const r of regions) m.set(r.region, r);
    return m;
  }, [regions]);

  const maxCount = useMemo(
    () => Math.max(1, ...regions.map((r) => r.report_count)),
    [regions],
  );
  const geoBounds = useMemo(() => getGeoBounds(geoData), [geoData]);

  // Load GeoJSON and merge region stats into feature properties
  useEffect(() => {
    fetch("/geo/china-provinces.json")
      .then((r) => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        for (const feature of geo.features) {
          const fullName = (feature.properties?.name as string) ?? "";
          const shortName = toShortName(fullName);
          const stat = regionLookup.get(shortName);
          const count = stat?.report_count ?? 0;
          feature.properties = {
            ...feature.properties,
            shortName,
            report_count: count,
            colorTier: getColorTier(count, maxCount),
            top_tags: JSON.stringify(stat?.top_tags ?? []),
          };
        }
        setGeoData(geo);
      });
  }, [regionLookup, maxCount]);

  const fitToBoundsOnce = useCallback(() => {
    if (!isMapLoadedRef.current || !geoBounds || hasFittedRef.current) return;
    mapRef.current?.fitBounds(geoBounds, { padding: 24, duration: 200 });
    hasFittedRef.current = true;
  }, [geoBounds]);

  const fitToBounds = useCallback(() => {
    if (!isMapLoadedRef.current || !geoBounds) return;
    mapRef.current?.fitBounds(geoBounds, { padding: 24, duration: 800 });
  }, [geoBounds]);

  // FlyTo on selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;
    if (selectedRegion) {
      const feature = geoData.features.find(
        (f) => f.properties?.shortName === selectedRegion,
      );
      const coords =
        feature?.properties?.centroid ?? feature?.properties?.center;
      if (coords) {
        map.flyTo({
          center: coords as [number, number],
          zoom: 5.5,
          duration: 800,
        });
      }
    } else if (lastSelectedRef.current) {
      fitToBounds();
    }
    lastSelectedRef.current = selectedRegion;
  }, [selectedRegion, geoData, fitToBounds]);

  useEffect(() => {
    fitToBoundsOnce();
  }, [fitToBoundsOnce]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const onMouseMove = useCallback((e: any) => {
    const feature = e.features?.[0];
    if (feature) {
      const shortName: string = feature.properties?.shortName ?? "";
      const count: number = feature.properties?.report_count ?? 0;
      let tags: string[] = [];
      try {
        tags = JSON.parse(feature.properties?.top_tags || "[]");
      } catch {
        /* ignore */
      }
      setHovered({ name: shortName, count, tags, x: e.point.x, y: e.point.y });
      mapRef.current?.getCanvas().style.setProperty("cursor", "pointer");
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(null);
    mapRef.current?.getCanvas().style.setProperty("cursor", "");
  }, []);

  const onClick = useCallback(
    (e: any) => {
      const feature = e.features?.[0];
      if (feature) {
        const shortName: string = feature.properties?.shortName ?? "";
        setSelectedRegion(selectedRegion === shortName ? null : shortName);
      }
    },
    [selectedRegion, setSelectedRegion],
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const baseStyle = useMemo(() => createBaseStyle(isDark), [isDark]);
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const fillPaint: Record<string, unknown> = useMemo(
    () => ({
      "fill-color": [
        "step",
        ["get", "colorTier"],
        colors[0],
        1,
        colors[1],
        2,
        colors[2],
        3,
        colors[3],
        4,
        colors[4],
      ],
    }),
    [colors],
  );

  const borderPaint: Record<string, unknown> = useMemo(
    () => ({
      "line-color": isDark
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(100, 100, 100, 0.3)",
      "line-width": 0.5,
    }),
    [isDark],
  );

  const hoverPaint: Record<string, unknown> = useMemo(
    () => ({
      "fill-color": isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(255, 255, 255, 0.25)",
    }),
    [isDark],
  );

  const selectedBorderPaint: Record<string, unknown> = useMemo(
    () => ({
      "line-color": isDark ? "#e85a5a" : "#b32b2b",
      "line-width": 2.5,
    }),
    [isDark],
  );

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={baseStyle}
        maxBounds={MAX_BOUNDS}
        interactiveLayerIds={geoData ? ["province-fill"] : []}
        onLoad={() => {
          isMapLoadedRef.current = true;
          fitToBoundsOnce();
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {geoData && (
          <Source id="provinces" type="geojson" data={geoData}>
            <Layer id="province-fill" type="fill" paint={fillPaint} />
            <Layer id="province-border" type="line" paint={borderPaint} />
            {hovered && (
              <Layer
                id="province-hover"
                type="fill"
                paint={hoverPaint}
                filter={["==", ["get", "shortName"], hovered.name]}
              />
            )}
            {selectedRegion && (
              <Layer
                id="province-selected"
                type="line"
                paint={selectedBorderPaint}
                filter={["==", ["get", "shortName"], selectedRegion]}
              />
            )}
          </Source>
        )}
      </MapGL>

      {hovered && (
        <div
          className="heatmap-tooltip"
          style={{
            left: hovered.x,
            top: hovered.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold">{hovered.name}</p>
          <p className="text-xs opacity-80">{hovered.count} 份情报</p>
          {hovered.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mr-1 text-[10px] opacity-70">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
