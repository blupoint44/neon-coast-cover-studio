// Colour grades for Neon Coast Cover Studio: real per-pixel canvas work. Each grade remaps the
// composed photo panels (gradient maps, posterize, monochrome contrast), then optional film grain
// and a vignette finish the poster look. Lettering is drawn after grading so type stays crisp.

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function mixChannel(original, graded, intensity) {
  return clampByte(original + (graded - original) * intensity);
}

function gradientMapColour(luminance, stops) {
  for (let index = 1; index < stops.length; index += 1) {
    if (luminance <= stops[index][0]) {
      const [stopAt, colourHigh] = stops[index];
      const [startAt, colourLow] = stops[index - 1];
      const blend = (luminance - startAt) / Math.max(0.0001, stopAt - startAt);
      return [
        colourLow[0] + (colourHigh[0] - colourLow[0]) * blend,
        colourLow[1] + (colourHigh[1] - colourLow[1]) * blend,
        colourLow[2] + (colourHigh[2] - colourLow[2]) * blend,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

const SUNSET_STOPS = [
  [0, [24, 8, 48]],
  [0.3, [116, 24, 92]],
  [0.55, [230, 66, 92]],
  [0.78, [255, 148, 62]],
  [1, [255, 238, 186]],
];

const NEON_STOPS = [
  [0, [4, 42, 58]],
  [0.35, [16, 96, 128]],
  [0.62, [148, 44, 148]],
  [0.85, [255, 84, 168]],
  [1, [255, 214, 240]],
];

function gradeSunsetPixel(r, g, b) {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const mapped = gradientMapColour(luminance, SUNSET_STOPS);
  // Keep a slice of the original detail so faces and cars still read as photographs.
  return [r * 0.34 + mapped[0] * 0.66, g * 0.34 + mapped[1] * 0.66, b * 0.34 + mapped[2] * 0.66];
}

function gradeNeonPixel(r, g, b) {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const mapped = gradientMapColour(luminance, NEON_STOPS);
  return [
    clampByte(r * 0.42 + mapped[0] * 0.58 + 6),
    clampByte(g * 0.42 + mapped[1] * 0.58),
    clampByte(b * 0.42 + mapped[2] * 0.58 + 10),
  ];
}

function gradeGoldenPixel(r, g, b) {
  const lifted = (channel) => 255 * Math.pow(channel / 255, 0.92);
  return [clampByte(lifted(r) * 1.1 + 10), clampByte(lifted(g) * 1.02 + 4), clampByte(lifted(b) * 0.8)];
}

function gradeInkPixel(r, g, b) {
  const steps = 4;
  const posterize = (channel) => Math.round((channel / 255) * (steps - 1)) * (255 / (steps - 1));
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const saturate = (channel) => clampByte(grey + (channel - grey) * 1.35);
  return [saturate(posterize(r)), saturate(posterize(g)), saturate(posterize(b))];
}

function gradeMonoPixel(r, g, b) {
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrasted = clampByte((grey - 128) * 1.28 + 128);
  return [contrasted, contrasted, clampByte(contrasted * 1.04)];
}

export const COLOUR_GRADES = [
  { id: 'sunset', name: 'Sunset Gradient Map', gradePixel: gradeSunsetPixel },
  { id: 'neon', name: 'Neon Nights', gradePixel: gradeNeonPixel },
  { id: 'golden', name: 'Golden Hour', gradePixel: gradeGoldenPixel },
  { id: 'ink', name: 'Ink Poster', gradePixel: gradeInkPixel },
  { id: 'mono', name: 'Mono Noir', gradePixel: gradeMonoPixel },
  { id: 'clean', name: 'Clean (no grade)', gradePixel: null },
];

export function findColourGrade(gradeId) {
  return COLOUR_GRADES.find((grade) => grade.id === gradeId) ?? COLOUR_GRADES[0];
}

/** Applies the chosen grade to every pixel of the canvas, blended by intensity (0..1). */
export function applyColourGrade(ctx, width, height, gradeId, intensity) {
  const grade = findColourGrade(gradeId);
  if (!grade.gradePixel || intensity <= 0) return;
  const frame = ctx.getImageData(0, 0, width, height);
  const data = frame.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const graded = grade.gradePixel(data[offset], data[offset + 1], data[offset + 2]);
    data[offset] = mixChannel(data[offset], graded[0], intensity);
    data[offset + 1] = mixChannel(data[offset + 1], graded[1], intensity);
    data[offset + 2] = mixChannel(data[offset + 2], graded[2], intensity);
  }
  ctx.putImageData(frame, 0, 0);
}

/** A warm sunset wash laid over the graded panels: magenta low, amber high. */
export function applySunsetWash(ctx, width, height, strength) {
  const wash = ctx.createLinearGradient(0, height, 0, 0);
  wash.addColorStop(0, `rgba(214, 36, 116, ${0.26 * strength})`);
  wash.addColorStop(0.55, `rgba(255, 110, 64, ${0.1 * strength})`);
  wash.addColorStop(1, `rgba(64, 24, 120, ${0.14 * strength})`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
}

let grainTile = null;

function buildGrainTile() {
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tileCtx = tile.getContext('2d');
  const frame = tileCtx.createImageData(140, 140);
  for (let offset = 0; offset < frame.data.length; offset += 4) {
    const value = 96 + Math.floor(Math.random() * 128);
    frame.data[offset] = value;
    frame.data[offset + 1] = value;
    frame.data[offset + 2] = value;
    frame.data[offset + 3] = 255;
  }
  tileCtx.putImageData(frame, 0, 0);
  return tile;
}

/** Overlays fine film grain with a soft-light style low-alpha pattern fill. */
export function applyFilmGrain(ctx, width, height) {
  if (!grainTile) grainTile = buildGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(grainTile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/** Darkens the corners so the eye lands on the title and the hero panel. */
export function applyVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) / 2;
  const shade = ctx.createRadialGradient(width / 2, height / 2, radius * 0.42, width / 2, height / 2, radius);
  shade.addColorStop(0, 'rgba(8, 0, 18, 0)');
  shade.addColorStop(1, 'rgba(8, 0, 18, 0.52)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

/** The full finishing stack, in poster order: grade, wash, grain, vignette. */
export function applyGradeStack(ctx, width, height, options) {
  applyColourGrade(ctx, width, height, options.gradeId, options.intensity);
  if (options.gradeId === 'sunset' || options.gradeId === 'neon') {
    applySunsetWash(ctx, width, height, options.intensity);
  }
  if (options.grain) applyFilmGrain(ctx, width, height);
  if (options.vignette) applyVignette(ctx, width, height);
}
