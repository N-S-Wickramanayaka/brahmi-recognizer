// Example photos visitors can try without their own image.
// Drop more into src/assets/examples/ (with a matching thumbnail in thumbs/)
// and they're picked up automatically.

const full = import.meta.glob<string>('./assets/examples/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default',
})
const thumbs = import.meta.glob<string>('./assets/examples/thumbs/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default',
})

export type ExamplePhoto = {
  id: string
  /** The image that gets analyzed. */
  url: string
  /** Small square preview for the picker (falls back to the full image). */
  thumb: string
  type: string
}

const fileName = (path: string) => path.split('/').pop()!
const MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

const thumbByName = new Map(Object.entries(thumbs).map(([path, url]) => [fileName(path), url]))

export const EXAMPLE_PHOTOS: ExamplePhoto[] = Object.entries(full).map(([path, url]) => {
  const name = fileName(path)
  const extension = name.split('.').pop()!.toLowerCase()
  return {
    id: name,
    url,
    thumb: thumbByName.get(name) ?? url,
    type: MIME[extension] ?? 'image/jpeg',
  }
})

/** Pick `count` random examples, avoiding the ids in `exclude` when there are enough others. */
export function pickExamples(count: number, exclude: string[] = []): ExamplePhoto[] {
  const excluded = new Set(exclude)
  const fresh = EXAMPLE_PHOTOS.filter((photo) => !excluded.has(photo.id))
  const pool = fresh.length >= count ? fresh : EXAMPLE_PHOTOS
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
