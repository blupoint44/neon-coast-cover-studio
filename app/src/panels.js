// Layout geometry for Neon Coast Cover Studio: every cover layout is a list of panel rectangles
// (plus a tilt, for the snapshot layout) computed from the export size, so the editor preview and
// the exported PNG always agree panel for panel.

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square post 1080 x 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait post 1080 x 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide banner 1920 x 1080', width: 1920, height: 1080 },
];

export function findExportSize(sizeId) {
  return EXPORT_SIZES.find((size) => size.id === sizeId) ?? EXPORT_SIZES[0];
}

function gridRects(width, height, columns, rows, margin, gap) {
  const cellWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (height - margin * 2 - gap * (rows - 1)) / rows;
  const rects = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      rects.push({
        x: margin + column * (cellWidth + gap),
        y: margin + row * (cellHeight + gap),
        w: cellWidth,
        h: cellHeight,
        tilt: 0,
      });
    }
  }
  return rects;
}

function heroPlusThreeRects(width, height, margin, gap) {
  const heroHeight = (height - margin * 2 - gap) * 0.64;
  const stripY = margin + heroHeight + gap;
  const stripHeight = height - margin - stripY;
  const cellWidth = (width - margin * 2 - gap * 2) / 3;
  const rects = [{ x: margin, y: margin, w: width - margin * 2, h: heroHeight, tilt: 0 }];
  for (let column = 0; column < 3; column += 1) {
    rects.push({ x: margin + column * (cellWidth + gap), y: stripY, w: cellWidth, h: stripHeight, tilt: 0 });
  }
  return rects;
}

function tiltedSnapshotRects(width, height) {
  // Slot 0 is the graded backdrop; slots 1-3 are snapshot frames rotated over it.
  const frameWidth = width * 0.44;
  const frameHeight = height * 0.52;
  const centreY = height * 0.44;
  return [
    { x: 0, y: 0, w: width, h: height, tilt: 0 },
    { x: width * 0.06, y: centreY - frameHeight / 2, w: frameWidth, h: frameHeight, tilt: -7 },
    { x: width * 0.30, y: centreY - frameHeight / 2 + height * 0.03, w: frameWidth, h: frameHeight, tilt: 2.5 },
    { x: width * 0.53, y: centreY - frameHeight / 2, w: frameWidth, h: frameHeight, tilt: 8 },
  ];
}

function storyStripRects(width, height, margin, gap) {
  const bandHeight = (height - margin * 2 - gap * 2) / 3;
  const rects = [];
  for (let row = 0; row < 3; row += 1) {
    rects.push({ x: margin, y: margin + row * (bandHeight + gap), w: width - margin * 2, h: bandHeight, tilt: 0 });
  }
  return rects;
}

export const COVER_LAYOUTS = [
  {
    id: 'grid9',
    name: 'Cover Grid 9',
    blurb: 'The classic nine-panel poster grid',
    slotCount: 9,
    rects: (w, h) => gridRects(w, h, 3, 3, Math.min(w, h) * 0.032, Math.min(w, h) * 0.016),
  },
  {
    id: 'hero-three',
    name: 'Hero + Three',
    blurb: 'One big hero shot over a three-photo strip',
    slotCount: 4,
    rects: (w, h) => heroPlusThreeRects(w, h, Math.min(w, h) * 0.032, Math.min(w, h) * 0.016),
  },
  {
    id: 'quad',
    name: 'Quad',
    blurb: 'A clean two-by-two panel split',
    slotCount: 4,
    rects: (w, h) => gridRects(w, h, 2, 2, Math.min(w, h) * 0.032, Math.min(w, h) * 0.016),
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    blurb: 'A single photo edge to edge',
    slotCount: 1,
    rects: (w, h) => [{ x: 0, y: 0, w, h, tilt: 0 }],
  },
  {
    id: 'tilted',
    name: 'Tilted Snaps',
    blurb: 'Three rotated snapshot frames over a graded backdrop',
    slotCount: 4,
    rects: (w, h) => tiltedSnapshotRects(w, h),
  },
  {
    id: 'strip',
    name: 'Story Strip',
    blurb: 'A vertical triptych of three bands',
    slotCount: 3,
    rects: (w, h) => storyStripRects(w, h, Math.min(w, h) * 0.032, Math.min(w, h) * 0.016),
  },
];

export function findCoverLayout(layoutId) {
  return COVER_LAYOUTS.find((layout) => layout.id === layoutId) ?? COVER_LAYOUTS[0];
}

export function panelRectsFor(layoutId, width, height) {
  return findCoverLayout(layoutId).rects(width, height);
}

/** A fresh per-panel crop state: which photo fills it, how it is panned (-1..1) and zoomed (1..3). */
export function createPanelState(photoId = null) {
  return { photoId, panX: 0, panY: 0, zoom: 1 };
}

export function clampPanelPan(panel) {
  panel.panX = Math.max(-1, Math.min(1, panel.panX));
  panel.panY = Math.max(-1, Math.min(1, panel.panY));
  panel.zoom = Math.max(1, Math.min(3, panel.zoom));
  return panel;
}

/** Index of the panel under a canvas point, or -1. Tilted frames are hit-tested by their plain rect. */
export function panelIndexAtPoint(rects, pointX, pointY) {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    const rect = rects[index];
    if (pointX >= rect.x && pointX <= rect.x + rect.w && pointY >= rect.y && pointY <= rect.y + rect.h) {
      return index;
    }
  }
  return -1;
}
