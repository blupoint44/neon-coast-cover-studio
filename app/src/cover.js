// Cover composition for Neon Coast Cover Studio: panels are drawn with their per-panel crop,
// the colour grade stack finishes the photos, and the lettering lands on top. The same render
// drives the live editor preview, the screenshot scenes and the exported PNG, so what the maker
// sees is exactly what they share.

import { applyGradeStack } from './grade.js';
import { drawCoverLettering } from './lettering.js';
import { findCoverLayout, findExportSize, panelRectsFor, createPanelState } from './panels.js';

export const MAX_PANELS = 9;

/** The whole editable cover as one plain state object the editor, history and shots all share. */
export function createCoverState(overrides = {}) {
  const state = {
    layoutId: 'grid9',
    sizeId: 'wide',
    caption: 'NEON COAST',
    subtitle: 'palm county heat',
    ribbon: 'PALM COUNTY HEAT',
    stars: 5,
    gradientTitle: true,
    gradeId: 'sunset',
    gradeIntensity: 0.85,
    grain: true,
    vignette: true,
    panels: Array.from({ length: MAX_PANELS }, () => createPanelState()),
    selectedPanel: 0,
    ...overrides,
  };
  return state;
}

/** Resizes the panel list to the layout's slot count, keeping crops already made. */
export function syncPanelsToLayout(state) {
  const needed = findCoverLayout(state.layoutId).slotCount;
  while (state.panels.length < needed) state.panels.push(createPanelState());
  if (state.selectedPanel >= needed) state.selectedPanel = 0;
  return needed;
}

/** Points every panel at one photo: the one-photo-fills-the-poster move. */
export function fillAllPanelsWithPhoto(state, photoId) {
  const count = syncPanelsToLayout(state);
  for (let index = 0; index < count; index += 1) {
    state.panels[index].photoId = photoId;
  }
}

/** Cycles a list of photos across the panels, repeating when the layout has more slots. */
export function assignPhotosAcrossPanels(state, photoIds) {
  const count = syncPanelsToLayout(state);
  for (let index = 0; index < count; index += 1) {
    state.panels[index].photoId = photoIds[index % photoIds.length];
    state.panels[index].panX = 0;
    state.panels[index].panY = 0;
    state.panels[index].zoom = 1;
  }
}

/** Draws one photo into one panel rect, honouring the panel's zoom and pan crop. */
export function drawPhotoInPanel(ctx, rect, image, panel) {
  const coverScale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
  const scale = coverScale * panel.zoom;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  const overflowX = drawnWidth - rect.w;
  const overflowY = drawnHeight - rect.h;
  const originX = rect.x - overflowX / 2 - (panel.panX * overflowX) / 2;
  const originY = rect.y - overflowY / 2 - (panel.panY * overflowY) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(image, originX, originY, drawnWidth, drawnHeight);
  ctx.restore();
}

/** Placeholder art for an empty panel: a dusk gradient waiting for a photo. */
export function drawEmptyPanel(ctx, rect, panelNumber) {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  gradient.addColorStop(0, '#3b1560');
  gradient.addColorStop(0.6, '#8c2064');
  gradient.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `${Math.max(15, rect.w * 0.07)}px 'Anton', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${panelNumber}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawPanelFrame(ctx, rect, coverWidth) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(2, coverWidth * 0.0035);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawTiltedSnapshot(ctx, rect, image, panel, coverWidth) {
  const centreX = rect.x + rect.w / 2;
  const centreY = rect.y + rect.h / 2;
  const border = coverWidth * 0.012;
  const footExtra = coverWidth * 0.045;
  ctx.save();
  ctx.translate(centreX, centreY);
  ctx.rotate((rect.tilt * Math.PI) / 180);
  ctx.shadowColor = 'rgba(5, 0, 16, 0.55)';
  ctx.shadowBlur = coverWidth * 0.03;
  ctx.fillStyle = '#fdfdf8';
  ctx.fillRect(-rect.w / 2 - border, -rect.h / 2 - border, rect.w + border * 2, rect.h + border * 2 + footExtra);
  ctx.shadowBlur = 0;
  const localRect = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h };
  if (image) drawPhotoInPanel(ctx, localRect, image, panel);
  else drawEmptyPanel(ctx, localRect, 0);
  ctx.restore();
}

/** Draws the neon selection outline the editor shows around the active panel. */
export function drawSelectedPanelHighlight(ctx, rect, panelNumber, coverWidth) {
  ctx.save();
  ctx.strokeStyle = '#22e6ff';
  ctx.lineWidth = Math.max(3, coverWidth * 0.005);
  ctx.setLineDash([coverWidth * 0.02, coverWidth * 0.012]);
  ctx.shadowColor = 'rgba(34, 230, 255, 0.9)';
  ctx.shadowBlur = coverWidth * 0.012;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#22e6ff';
  const tagWidth = coverWidth * 0.11;
  const tagHeight = coverWidth * 0.032;
  ctx.fillRect(rect.x, Math.max(0, rect.y - tagHeight), tagWidth, tagHeight);
  ctx.fillStyle = '#08131c';
  ctx.font = `${tagHeight * 0.62}px 'Anton', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${panelNumber}`, rect.x + tagWidth / 2, Math.max(tagHeight / 2, rect.y - tagHeight / 2));
  ctx.restore();
}

/**
 * Renders the full cover onto a canvas at the state's export size.
 * options.showSelection draws the editor's highlight; exports leave it off.
 */
export function renderCover(canvas, state, library, options = {}) {
  const size = findExportSize(state.sizeId);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const slotCount = syncPanelsToLayout(state);
  const rects = panelRectsFor(state.layoutId, size.width, size.height);

  ctx.fillStyle = '#150826';
  ctx.fillRect(0, 0, size.width, size.height);

  if (state.layoutId === 'tilted') {
    const backdropPanel = state.panels[0];
    const backdropPhoto = backdropPanel.photoId ? library.findPhoto(backdropPanel.photoId) : null;
    if (backdropPhoto) drawPhotoInPanel(ctx, rects[0], backdropPhoto.image, backdropPanel);
    else drawEmptyPanel(ctx, rects[0], 1);
  }

  for (let index = 0; index < slotCount; index += 1) {
    if (state.layoutId === 'tilted' && index === 0) continue;
    const panel = state.panels[index];
    const photo = panel.photoId ? library.findPhoto(panel.photoId) : null;
    if (state.layoutId === 'tilted') {
      drawTiltedSnapshot(ctx, rects[index], photo ? photo.image : null, panel, size.width);
    } else if (photo) {
      drawPhotoInPanel(ctx, rects[index], photo.image, panel);
      drawPanelFrame(ctx, rects[index], size.width);
    } else {
      drawEmptyPanel(ctx, rects[index], index + 1);
      drawPanelFrame(ctx, rects[index], size.width);
    }
  }

  // The outer poster frame that ties the grid together.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = Math.max(3, size.width * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size.width - ctx.lineWidth, size.height - ctx.lineWidth);

  applyGradeStack(ctx, size.width, size.height, {
    gradeId: state.gradeId,
    intensity: state.gradeIntensity,
    grain: state.grain,
    vignette: state.vignette,
  });

  drawCoverLettering(ctx, size.width, size.height, state);

  if (options.showSelection) {
    const rect = rects[state.selectedPanel];
    if (rect) drawSelectedPanelHighlight(ctx, rect, state.selectedPanel + 1, size.width);
  }
  return canvas;
}

/** Renders the cover off-screen and downloads it as a PNG at the exact export size. */
export function exportCoverAsPng(state, library, onDone) {
  const size = findExportSize(state.sizeId);
  const offscreen = document.createElement('canvas');
  renderCover(offscreen, state, library);
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    if (onDone) onDone(link.download);
  }, 'image/png');
}
