"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useLocale } from "next-intl";
import type { Map as GlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

/** OpenFreeMap vector style (free, no key). Rendered by MapLibre GL inside Leaflet. */
export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const LEAFLET_PREFIX = '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>';
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · ' +
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>';

/** Shows place names in the page language when OpenStreetMap has them, else the local name. */
function localizeLabels(gl: GlMap, locale: string) {
  const field = ["coalesce", ["get", `name:${locale}`], ["get", "name:latin"], ["get", "name"]];
  for (const layer of gl.getStyle()?.layers ?? []) {
    if (layer.type !== "symbol") continue;
    const current = gl.getLayoutProperty(layer.id, "text-field");
    // Only touch name labels (road numbers, house numbers etc. keep their own field).
    if (current && JSON.stringify(current).includes("name")) {
      gl.setLayoutProperty(layer.id, "text-field", field as unknown as string);
    }
  }
}

/**
 * Base map for every Leaflet map in BLADUS: OpenFreeMap tiles and the attribution line
 * "Leaflet | © OpenStreetMap · OpenFreeMap". Render inside a react-leaflet <MapContainer>
 * that keeps its attribution control on.
 */
export default function OpenFreeMapLayer({ style = OPENFREEMAP_STYLE }: { style?: string }) {
  const map = useMap();
  const locale = useLocale();

  useEffect(() => {
    map.attributionControl?.setPrefix(LEAFLET_PREFIX);
    const layer = L.maplibreGL({ style, attribution: MAP_ATTRIBUTION } as L.LeafletMaplibreGLOptions).addTo(map);
    const gl = layer.getMaplibreMap();
    const onLoad = () => localizeLabels(gl, locale);
    gl.on("load", onLoad);
    return () => {
      gl.off("load", onLoad);
      layer.remove();
    };
  }, [map, style, locale]);

  return null;
}
