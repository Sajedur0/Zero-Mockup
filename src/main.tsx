import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "./styles.css";
import Konva from "konva";
import { displayPixelRatio, onIdle, requestFonts, type FontNeed } from "./perf";

// Cap Konva canvases before the first Stage is created.
Konva.pixelRatio = displayPixelRatio();

/**
 * Paint the editor immediately instead of waiting for every font file.
 *
 * The old version blocked the first render on four `document.fonts.load()`
 * calls, including the 108 KB Bengali face and Playfair Display, so phones
 * stared at a blank page until ~230 KB of fonts had been fetched. Now the UI
 * mounts right away, only the fonts the project actually uses are requested
 * in the background, and Konva text is re-drawn (`zero:fonts-updated`) once
 * they arrive.
 */
const BENGALI = /[\u0980-\u09FF]/;

function savedProject(): string {
  try {
    return localStorage.getItem("zero-mockup-project-v1") || "";
  } catch {
    return "";
  }
}

function usedFonts(): FontNeed[] {
  const fonts: FontNeed[] = [
    { spec: "700 20px Manrope" },
    { spec: '400 20px "DM Sans"' },
  ];
  const saved = savedProject();
  if (BENGALI.test(saved))
    fonts.push({ spec: '400 20px "Noto Sans Bengali"', sample: "বাংলা" });
  if (/Playfair Display/.test(saved))
    fonts.push({ spec: '700 20px "Playfair Display"' });
  return fonts;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

onIdle(() => requestFonts(usedFonts()), 150);
