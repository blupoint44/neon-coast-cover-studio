// The photo library for Neon Coast Cover Studio. Photos live only on this machine: bundled
// samples ship inside app/samples/, and a person's own photos are read as object URLs from the
// files they pick or drop. Nothing is ever uploaded anywhere.

export const SAMPLE_PHOTOS = [
  { name: 'rooftop', label: 'Rooftop Dusk' },
  { name: 'convertible', label: 'Boulevard Convertible' },
  { name: 'neon', label: 'Neon Night Street' },
  { name: 'speedboat', label: 'Speedboat Sunset' },
  { name: 'boulevard', label: 'Palm Boulevard' },
  { name: 'pier', label: 'Sunset Pier' },
];

/** Loads an image element from a URL, resolving once it can be drawn to a canvas. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image ${url}`));
    image.src = url;
  });
}

/** A small library object: an ordered photo list plus lookup helpers the editor shares. */
export function createPhotoLibrary() {
  let sequence = 0;
  const photos = [];
  return {
    photos,
    addPhoto(label, image, url) {
      sequence += 1;
      const photo = { id: `photo-${sequence}`, label, image, url };
      photos.push(photo);
      return photo;
    },
    findPhoto(photoId) {
      return photos.find((photo) => photo.id === photoId) ?? null;
    },
    firstPhoto() {
      return photos[0] ?? null;
    },
  };
}

/** Loads one bundled sample photo (samples/<name>.jpg) into the library. */
export async function loadSampleIntoLibrary(library, sampleName) {
  const sample = SAMPLE_PHOTOS.find((entry) => entry.name === sampleName) ?? SAMPLE_PHOTOS[0];
  const existing = library.photos.find((photo) => photo.label === sample.label);
  if (existing) return existing;
  const image = await loadImageElement(`samples/${sample.name}.jpg`);
  return library.addPhoto(sample.label, image, `samples/${sample.name}.jpg`);
}

/** Loads every bundled sample, in strip order. */
export async function loadAllSamplesIntoLibrary(library) {
  const loaded = [];
  for (const sample of SAMPLE_PHOTOS) {
    loaded.push(await loadSampleIntoLibrary(library, sample.name));
  }
  return loaded;
}

/** Reads a person's own photo file into the library as a local object URL. */
export async function loadPhotoFileIntoLibrary(library, file) {
  const url = URL.createObjectURL(file);
  const image = await loadImageElement(url);
  const label = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 24) || 'My photo';
  return library.addPhoto(label, image, url);
}

/** Reads several picked or dropped files; non-image files are skipped quietly. */
export async function loadPhotoFilesIntoLibrary(library, fileList) {
  const added = [];
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    added.push(await loadPhotoFileIntoLibrary(library, file));
  }
  return added;
}
