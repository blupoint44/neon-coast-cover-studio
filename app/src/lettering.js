// Cover lettering for Neon Coast Cover Studio: the badge ribbon up top, the script subtitle, the
// heat-star meter and the huge condensed title along the foot. All wording is invented in-fiction
// text typed by the cover's maker; the faces are the vendored OFL fonts Anton and Pacifico.

export const TITLE_FONT_FAMILY = "'Anton', 'Arial Narrow', sans-serif";
export const SCRIPT_FONT_FAMILY = "'Pacifico', 'Comic Sans MS', cursive";

function drawStarPath(ctx, centreX, centreY, radius) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const spoke = point % 2 === 0 ? radius : radius * 0.46;
    const x = centreX + Math.cos(angle) * spoke;
    const y = centreY + Math.sin(angle) * spoke;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws the 0-5 heat meter: gold stars for the rating, dim outlines for the rest. */
export function drawHeatStars(ctx, centreX, centreY, starCount, radius) {
  const spacing = radius * 2.5;
  const startX = centreX - spacing * 2;
  for (let index = 0; index < 5; index += 1) {
    drawStarPath(ctx, startX + index * spacing, centreY, radius);
    if (index < starCount) {
      ctx.fillStyle = '#ffd23e';
      ctx.shadowColor = 'rgba(255, 160, 32, 0.85)';
      ctx.shadowBlur = radius * 0.7;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255, 226, 150, 0.55)';
      ctx.lineWidth = radius * 0.12;
      ctx.stroke();
    }
  }
}

/** Draws the editable badge ribbon: a hot-pink pill with letterspaced capitals. */
export function drawBadgeRibbon(ctx, width, ribbonText) {
  const text = ribbonText.trim().toUpperCase();
  if (!text) return;
  const fontSize = Math.max(20, width * 0.026);
  ctx.font = `${fontSize}px ${TITLE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(text).width + fontSize * 2.4;
  const pillHeight = fontSize * 1.9;
  const pillX = (width - textWidth) / 2;
  const pillY = width * 0.028;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 47, 146, 0.65)';
  ctx.shadowBlur = fontSize * 0.8;
  ctx.fillStyle = '#e91e7f';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, textWidth, pillHeight, pillHeight / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width / 2, pillY + pillHeight / 2 + fontSize * 0.04);
}

/** Shrinks the Anton title until it fits the cover width, and returns the size used. */
export function fitTitleFontSize(ctx, titleText, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${TITLE_FONT_FAMILY}`;
  while (ctx.measureText(titleText).width > maxWidth && size > 18) {
    size -= 4;
    ctx.font = `${size}px ${TITLE_FONT_FAMILY}`;
  }
  return size;
}

/** The script subtitle in neon pink Pacifico, with a soft glow, above the title. */
export function drawScriptSubtitle(ctx, width, baselineY, subtitleText) {
  const text = subtitleText.trim();
  if (!text) return 0;
  const fontSize = Math.max(24, width * 0.045);
  ctx.font = `${fontSize}px ${SCRIPT_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(255, 47, 146, 0.95)';
  ctx.shadowBlur = fontSize * 0.55;
  ctx.fillStyle = '#ff5fa8';
  ctx.fillText(text, width / 2, baselineY);
  ctx.restore();
  ctx.fillStyle = '#ffd7ec';
  ctx.fillText(text, width / 2, baselineY);
  return fontSize;
}

/** The main title: huge condensed capitals, sunset-gradient fill or clean white, dark outline. */
export function drawCoverTitle(ctx, width, baselineY, titleText, useGradientFill) {
  const text = titleText.trim().toUpperCase();
  if (!text) return 0;
  const size = fitTitleFontSize(ctx, text, width * 0.94, width * 0.155);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(10, 0, 24, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160424';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(text, width / 2, baselineY);
  ctx.restore();
  if (useGradientFill) {
    const gradient = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    gradient.addColorStop(0, '#ffe259');
    gradient.addColorStop(0.45, '#ffa751');
    gradient.addColorStop(0.75, '#ff2f92');
    gradient.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(text, width / 2, baselineY);
  return size;
}

/**
 * Draws the whole lettering stack over a graded cover: a foot scrim for legibility, the ribbon,
 * the heat stars, the script subtitle and the title, laid out from the bottom up.
 */
export function drawCoverLettering(ctx, width, height, lettering) {
  const scrim = ctx.createLinearGradient(0, height * 0.58, 0, height);
  scrim.addColorStop(0, 'rgba(10, 2, 24, 0)');
  scrim.addColorStop(0.62, 'rgba(10, 2, 24, 0.42)');
  scrim.addColorStop(1, 'rgba(10, 2, 24, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);

  drawBadgeRibbon(ctx, width, lettering.ribbon);

  const titleBaseline = height * 0.955;
  const titleSize = drawCoverTitle(ctx, width, titleBaseline, lettering.caption, lettering.gradientTitle);
  const subtitleBaseline = titleBaseline - titleSize * 1.08;
  const subtitleSize = drawScriptSubtitle(ctx, width, subtitleBaseline, lettering.subtitle);
  if (lettering.stars > 0) {
    const starRadius = Math.max(11, width * 0.016);
    const starsY = subtitleBaseline - subtitleSize * 1.25 - starRadius;
    drawHeatStars(ctx, width / 2, starsY, lettering.stars, starRadius);
  }
}
