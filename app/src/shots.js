// Fixed screenshot scenes for Neon Coast Cover Studio, driven by the ?shot= query:
//   ?shot=cover&layout=grid9&size=1920x1080&caption=..&sub=..&photos=rooftop,neon&grade=sunset
//     draws that cover full-viewport at the requested pixel size.
//   ?shot=editor&layout=hero-three&photos=..&caption=..
//     shows the editor mid-work: samples loaded, a layout picked, a panel selected, caption typed.
// Both set window.__shotReady once the scene is painted, fonts included.

import { assignPhotosAcrossPanels } from './cover.js';
import { loadAllSamplesIntoLibrary, loadSampleIntoLibrary } from './photos.js';
import { EXPORT_SIZES } from './panels.js';

async function waitForCoverFonts() {
  try {
    await Promise.all([
      document.fonts.load("80px 'Anton'"),
      document.fonts.load("40px 'Pacifico'"),
    ]);
    await document.fonts.ready;
  } catch {
    // A font that fails to load falls back to the system faces in the stacks.
  }
}

function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

function sizeIdFromPixels(query) {
  const raw = query.get('size');
  if (!raw) return null;
  const match = raw.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  const size = EXPORT_SIZES.find(
    (entry) => entry.width === Number(match[1]) && entry.height === Number(match[2]),
  );
  return size ? size.id : null;
}

async function loadScenePhotos(library, query) {
  const names = (query.get('photos') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) {
    const all = await loadAllSamplesIntoLibrary(library);
    return all.map((photo) => photo.id);
  }
  const ids = [];
  for (const name of names) {
    const photo = await loadSampleIntoLibrary(library, name);
    ids.push(photo.id);
  }
  return ids;
}

function applySceneWording(state, query) {
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('sub')) state.subtitle = query.get('sub');
  if (query.get('ribbon')) state.ribbon = query.get('ribbon');
  if (query.get('grade')) state.gradeId = query.get('grade');
  if (query.get('layout')) state.layoutId = query.get('layout');
  const stars = Number(query.get('stars'));
  if (Number.isInteger(stars) && stars >= 0 && stars <= 5) state.stars = stars;
}

/** Runs the ?shot= scene against the editor's shared context and refreshes the page. */
export async function runShotScene(query, context) {
  const { state, library, refreshEditor, renderPreview } = context;
  const shotKind = query.get('shot');
  const photoIds = await loadScenePhotos(library, query);
  applySceneWording(state, query);
  assignPhotosAcrossPanels(state, photoIds);

  if (shotKind === 'cover') {
    const sizeId = sizeIdFromPixels(query);
    if (sizeId) state.sizeId = sizeId;
    document.body.classList.add('shot-cover');
    await waitForCoverFonts();
    renderPreview(false);
    markShotReady();
    return;
  }

  // The editor scene: the studio as a user would see it mid-work.
  const selected = Number(query.get('select'));
  state.selectedPanel = Number.isInteger(selected) && selected > 0 ? selected - 1 : 1;
  await waitForCoverFonts();
  refreshEditor();
  markShotReady();
}
