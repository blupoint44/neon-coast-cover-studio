[![Make GTA 6 Cover Art on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Neon Coast Cover Studio rank](https://make.fun/badge/gta6-cover-art-01/blupoint44/neon-coast-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Neon Coast Cover Studio reward](https://make.fun/badge/gta6-cover-art-01/blupoint44/neon-coast-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

An offline, static, vanilla-JS cover-art maker. Drop in your own photos, arrange them across a
multi-panel poster layout, run them through a Vice-coast colour grade, set the lettering, and
export a share-ready PNG — all in the browser, with no uploads and no network requests. Every
name and line of text on the cover is invented in-fiction wording ("Neon Coast", "Palm County
Heat"); the app ships no third-party game artwork, logos or fonts.

## Features

- **Six layouts** — Cover Grid 9 (the classic 3×3 panel grid), Hero + Three, Quad (2×2),
  Full Bleed, Tilted Snaps (three rotated snapshot frames over a graded backdrop) and
  Story Strip (a vertical triptych).
- **Your photos, your crops** — multi-file upload and drag-and-drop (local object URLs only,
  never uploaded), six bundled sample photos one click away, click-a-panel / click-a-photo
  assignment, a "one photo fills all panels" button, and per-panel pan (drag on the preview)
  and zoom (slider or mouse wheel).
- **Five colour grades** — Sunset Gradient Map, Neon Nights, Golden Hour, Ink Poster and
  Mono Noir, all real per-pixel canvas work, with an intensity slider plus film grain and
  vignette toggles.
- **Poster lettering** — vendored OFL fonts Anton (huge condensed title, optional
  sunset-gradient fill with a dark outline) and Pacifico (neon-pink script subtitle), a 0–5
  star heat meter and an editable badge ribbon.
- **Post sizes** — 1080×1080, 1080×1350 and 1920×1080, with one-click PNG export at the exact
  size and a live preview that renders the identical composition.
- **Editor comforts** — dark Vice-neon UI, panel selection highlight, and undo/redo.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080. Any static file server pointed at `app/` works just as well;
there is no build step.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` to the output directory and writes its `dossier.json` with the
vendored make.fun library.

## License

MIT — see `LICENSE`. The vendored fonts are licensed under the SIL Open Font License 1.1; their
license texts live beside them in `app/fonts/`. The bundled sample photos were generated with an
image model for this project and are free to use.
