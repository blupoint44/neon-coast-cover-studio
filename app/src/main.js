// Neon Coast Cover Studio — editor wiring. Owns the shared cover state and the photo library,
// binds every control on the page, keeps the live preview honest, and hands screenshot scenes
// (?shot=...) to ./shots.js. Everything runs locally in the page; photos never leave the machine.

import {
  assignPhotosAcrossPanels,
  createCoverState,
  exportCoverAsPng,
  fillAllPanelsWithPhoto,
  renderCover,
  syncPanelsToLayout,
} from './cover.js';
import { COLOUR_GRADES } from './grade.js';
import { COVER_LAYOUTS, EXPORT_SIZES, clampPanelPan, panelIndexAtPoint, panelRectsFor, findExportSize } from './panels.js';
import { createPhotoLibrary, loadAllSamplesIntoLibrary, loadPhotoFilesIntoLibrary } from './photos.js';
import { runShotScene } from './shots.js';

const elements = {
  canvas: document.getElementById('stage-canvas'),
  fileInput: document.getElementById('photo-file-input'),
  dropZone: document.getElementById('drop-zone'),
  photoStrip: document.getElementById('photo-strip'),
  fillAllButton: document.getElementById('fill-all-button'),
  layoutSelect: document.getElementById('layout-select'),
  sizeSelect: document.getElementById('size-select'),
  gradeSelect: document.getElementById('grade-select'),
  intensityRange: document.getElementById('intensity-range'),
  grainToggle: document.getElementById('grain-toggle'),
  vignetteToggle: document.getElementById('vignette-toggle'),
  gradientToggle: document.getElementById('gradient-toggle'),
  captionInput: document.getElementById('caption-input'),
  subtitleInput: document.getElementById('subtitle-input'),
  ribbonInput: document.getElementById('ribbon-input'),
  starsRow: document.getElementById('stars-row'),
  zoomRange: document.getElementById('zoom-range'),
  resetCropButton: document.getElementById('reset-crop-button'),
  panelInfo: document.getElementById('panel-info'),
  statusLine: document.getElementById('status-line'),
  undoButton: document.getElementById('undo-button'),
  redoButton: document.getElementById('redo-button'),
  exportButton: document.getElementById('export-button'),
};

const state = createCoverState();
const library = createPhotoLibrary();

const undoStack = [];
const redoStack = [];

// History checkpoints: pushHistory files away the state as it was BEFORE the edit just made,
// so Undo always lands on the previous cover, never on a copy of the current one.
let committedSnapshot = null;

function snapshotState() {
  return JSON.stringify(state);
}

function restoreState(snapshot) {
  const parsed = JSON.parse(snapshot);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, parsed);
}

function pushHistory() {
  if (committedSnapshot !== null) {
    undoStack.push(committedSnapshot);
    if (undoStack.length > 60) undoStack.shift();
  }
  committedSnapshot = snapshotState();
  redoStack.length = 0;
  syncHistoryButtons();
}

function undoLastEdit() {
  if (undoStack.length === 0) return;
  redoStack.push(snapshotState());
  restoreState(undoStack.pop());
  committedSnapshot = snapshotState();
  refreshEditor();
}

function redoLastEdit() {
  if (redoStack.length === 0) return;
  undoStack.push(snapshotState());
  restoreState(redoStack.pop());
  committedSnapshot = snapshotState();
  refreshEditor();
}

function syncHistoryButtons() {
  elements.undoButton.disabled = undoStack.length === 0;
  elements.redoButton.disabled = redoStack.length === 0;
}

function setStatus(message) {
  elements.statusLine.textContent = message;
}

function renderPreview(showSelection = true) {
  renderCover(elements.canvas, state, library, { showSelection });
}

function selectedPanel() {
  syncPanelsToLayout(state);
  return state.panels[state.selectedPanel];
}

function refreshPhotoStrip() {
  elements.photoStrip.replaceChildren();
  for (const photo of library.photos) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-thumb';
    button.title = `Put "${photo.label}" in panel ${state.selectedPanel + 1}`;
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = photo.label;
    const label = document.createElement('span');
    label.textContent = photo.label;
    button.append(image, label);
    button.addEventListener('click', () => {
      selectedPanel().photoId = photo.id;
      pushHistory();
      refreshEditor();
      setStatus(`Panel ${state.selectedPanel + 1} now shows ${photo.label}.`);
    });
    elements.photoStrip.append(button);
  }
}

function refreshPanelInfo() {
  const panel = selectedPanel();
  const photo = panel.photoId ? library.findPhoto(panel.photoId) : null;
  elements.panelInfo.textContent = photo
    ? `Panel ${state.selectedPanel + 1}: ${photo.label} — drag on the preview to pan, scroll or use the slider to zoom.`
    : `Panel ${state.selectedPanel + 1}: empty — click a photo below to fill it.`;
  elements.zoomRange.value = String(panel.zoom);
}

function refreshEditor() {
  syncPanelsToLayout(state);
  elements.layoutSelect.value = state.layoutId;
  elements.sizeSelect.value = state.sizeId;
  elements.gradeSelect.value = state.gradeId;
  elements.intensityRange.value = String(Math.round(state.gradeIntensity * 100));
  elements.grainToggle.checked = state.grain;
  elements.vignetteToggle.checked = state.vignette;
  elements.gradientToggle.checked = state.gradientTitle;
  elements.captionInput.value = state.caption;
  elements.subtitleInput.value = state.subtitle;
  elements.ribbonInput.value = state.ribbon;
  for (const button of elements.starsRow.querySelectorAll('button')) {
    button.classList.toggle('lit', Number(button.dataset.stars) <= state.stars);
    button.setAttribute('aria-pressed', String(Number(button.dataset.stars) === state.stars));
  }
  refreshPhotoStrip();
  refreshPanelInfo();
  renderPreview(true);
  syncHistoryButtons();
}

function fillSelect(select, options, valueKey, labelKey) {
  for (const option of options) {
    const element = document.createElement('option');
    element.value = option[valueKey];
    element.textContent = option[labelKey];
    select.append(element);
  }
}

fillSelect(elements.layoutSelect, COVER_LAYOUTS, 'id', 'name');
fillSelect(elements.sizeSelect, EXPORT_SIZES, 'id', 'label');
fillSelect(elements.gradeSelect, COLOUR_GRADES, 'id', 'name');

elements.layoutSelect.addEventListener('change', () => {
  state.layoutId = elements.layoutSelect.value;
  syncPanelsToLayout(state);
  pushHistory();
  refreshEditor();
});

elements.sizeSelect.addEventListener('change', () => {
  state.sizeId = elements.sizeSelect.value;
  pushHistory();
  refreshEditor();
  const size = findExportSize(state.sizeId);
  setStatus(`Export size is now ${size.width} x ${size.height}.`);
});

elements.gradeSelect.addEventListener('change', () => {
  state.gradeId = elements.gradeSelect.value;
  pushHistory();
  refreshEditor();
});

elements.intensityRange.addEventListener('input', () => {
  state.gradeIntensity = Number(elements.intensityRange.value) / 100;
  renderPreview(true);
});
elements.intensityRange.addEventListener('change', pushHistory);

for (const [toggle, key] of [
  [elements.grainToggle, 'grain'],
  [elements.vignetteToggle, 'vignette'],
  [elements.gradientToggle, 'gradientTitle'],
]) {
  toggle.addEventListener('change', () => {
    state[key] = toggle.checked;
    pushHistory();
    renderPreview(true);
  });
}

for (const [input, key] of [
  [elements.captionInput, 'caption'],
  [elements.subtitleInput, 'subtitle'],
  [elements.ribbonInput, 'ribbon'],
]) {
  input.addEventListener('input', () => {
    state[key] = input.value;
    renderPreview(true);
  });
  input.addEventListener('change', pushHistory);
}

for (const button of elements.starsRow.querySelectorAll('button')) {
  button.addEventListener('click', () => {
    state.stars = Number(button.dataset.stars);
    pushHistory();
    refreshEditor();
  });
}

elements.zoomRange.addEventListener('input', () => {
  const panel = selectedPanel();
  panel.zoom = Number(elements.zoomRange.value);
  clampPanelPan(panel);
  renderPreview(true);
});
elements.zoomRange.addEventListener('change', pushHistory);

elements.resetCropButton.addEventListener('click', () => {
  const panel = selectedPanel();
  panel.panX = 0;
  panel.panY = 0;
  panel.zoom = 1;
  pushHistory();
  refreshEditor();
});

elements.fillAllButton.addEventListener('click', () => {
  const panel = selectedPanel();
  const photoId = panel.photoId ?? library.firstPhoto()?.id;
  if (!photoId) return;
  fillAllPanelsWithPhoto(state, photoId);
  pushHistory();
  refreshEditor();
  setStatus('One photo now fills every panel — pan each panel for a different crop of it.');
});

async function addPhotoFiles(fileList) {
  const added = await loadPhotoFilesIntoLibrary(library, fileList);
  if (added.length === 0) return;
  const panel = selectedPanel();
  if (!panel.photoId) panel.photoId = added[0].id;
  pushHistory();
  refreshEditor();
  setStatus(`Added ${added.length} photo${added.length > 1 ? 's' : ''} — stored only in this page, never uploaded.`);
}

elements.fileInput.addEventListener('change', () => {
  addPhotoFiles(elements.fileInput.files);
  elements.fileInput.value = '';
});

elements.dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  elements.dropZone.classList.add('dragging');
});
elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('dragging'));
elements.dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove('dragging');
  addPhotoFiles(event.dataTransfer.files);
});

elements.exportButton.addEventListener('click', () => {
  exportCoverAsPng(state, library, (fileName) => setStatus(`Saved ${fileName} — ready to post.`));
});

elements.undoButton.addEventListener('click', undoLastEdit);

elements.redoButton.addEventListener('click', redoLastEdit);

// Keyboard: Ctrl/Cmd+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes, [ and ] cycle the selected panel,
// and E exports — handy when both hands are already on the cover.
document.addEventListener('keydown', (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redoLastEdit();
    else undoLastEdit();
    return;
  }
  if (typing) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redoLastEdit();
  } else if (event.key === '[' || event.key === ']') {
    const count = syncPanelsToLayout(state);
    const step = event.key === ']' ? 1 : -1;
    state.selectedPanel = (state.selectedPanel + step + count) % count;
    refreshEditor();
  } else if (event.key.toLowerCase() === 'e') {
    elements.exportButton.click();
  }
});

// --- Direct manipulation on the preview: click selects a panel, drag pans its crop, wheel zooms.

function canvasPointFromEvent(event) {
  const bounds = elements.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * elements.canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * elements.canvas.height,
  };
}

let dragSession = null;

elements.canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPointFromEvent(event);
  const size = findExportSize(state.sizeId);
  const rects = panelRectsFor(state.layoutId, size.width, size.height);
  const index = panelIndexAtPoint(rects, point.x, point.y);
  if (index === -1) return;
  if (index !== state.selectedPanel) {
    state.selectedPanel = index;
    refreshEditor();
  }
  const panel = selectedPanel();
  dragSession = {
    startX: point.x,
    startY: point.y,
    panX: panel.panX,
    panY: panel.panY,
    rect: rects[index],
    moved: false,
  };
  elements.canvas.setPointerCapture(event.pointerId);
});

elements.canvas.addEventListener('pointermove', (event) => {
  if (!dragSession) return;
  const point = canvasPointFromEvent(event);
  const panel = selectedPanel();
  panel.panX = dragSession.panX - ((point.x - dragSession.startX) / dragSession.rect.w) * 1.4;
  panel.panY = dragSession.panY - ((point.y - dragSession.startY) / dragSession.rect.h) * 1.4;
  clampPanelPan(panel);
  dragSession.moved = true;
  renderPreview(true);
});

elements.canvas.addEventListener('pointerup', () => {
  if (dragSession && dragSession.moved) pushHistory();
  dragSession = null;
  refreshPanelInfo();
});

elements.canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const panel = selectedPanel();
    panel.zoom += event.deltaY < 0 ? 0.08 : -0.08;
    clampPanelPan(panel);
    elements.zoomRange.value = String(panel.zoom);
    renderPreview(true);
  },
  { passive: false },
);

// --- Startup: a screenshot scene when asked, otherwise a ready-to-play studio with samples in.

const query = new URLSearchParams(location.search);

async function startStudio() {
  if (query.get('shot')) {
    await runShotScene(query, { state, library, refreshEditor, renderPreview });
    return;
  }
  const samples = await loadAllSamplesIntoLibrary(library);
  assignPhotosAcrossPanels(state, samples.map((photo) => photo.id));
  committedSnapshot = snapshotState();
  refreshEditor();
  setStatus('Samples are in — swap in your own photos, pick a layout, export the PNG.');
}

startStudio();
