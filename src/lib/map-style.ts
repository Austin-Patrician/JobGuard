import type { StyleSpecification } from "maplibre-gl";

export function createBaseStyle(isDark: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": isDark ? "#16130f" : "#f2f4f8",
        },
      },
    ],
  };
}

export const LIGHT_COLORS = [
  "rgba(200, 200, 200, 0.4)",
  "rgba(179, 43, 43, 0.2)",
  "rgba(179, 43, 43, 0.4)",
  "rgba(179, 43, 43, 0.6)",
  "rgba(179, 43, 43, 0.85)",
];

export const DARK_COLORS = [
  "rgba(60, 60, 60, 0.4)",
  "rgba(232, 90, 90, 0.2)",
  "rgba(232, 90, 90, 0.4)",
  "rgba(232, 90, 90, 0.6)",
  "rgba(232, 90, 90, 0.85)",
];
