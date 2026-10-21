// The characters the model can recognize, with a reference image for each.
// Shared by the supported-letters list and the predictions panel.

// Every image in src/assets/letters/ is picked up automatically and matched
// to a letter by its file name (ka.webp -> "ka").
const imageFiles = import.meta.glob<string>('./assets/letters/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default',
})

const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(imageFiles).map(([path, url]) => [
    path.split('/').pop()!.replace(/\.\w+$/, '').toLowerCase(),
    url,
  ]),
)

export type Letter = {
  /** Romanized name. Must match the image file name and the label the model returns. */
  name: string
  /** Sinhala equivalent. */
  sinhala: string
  /** Reference image, if one is in src/assets/letters/. */
  image?: string
}

// Listed in Brahmi/Sinhala alphabet order (the same order as the header frieze).
// To support a new character, add its image to src/assets/letters/ and a line here.
const LETTERS: Omit<Letter, 'image'>[] = [
  { name: 'ka', sinhala: 'ක' },
  { name: 'ga', sinhala: 'ග' },
  { name: 'tha', sinhala: 'ත' },
  { name: 'dha', sinhala: 'ද' },
  { name: 'na', sinhala: 'න' },
  { name: 'pa', sinhala: 'ප' },
  { name: 'ba', sinhala: 'බ' },
  { name: 'ma', sinhala: 'ම' },
  { name: 'ya', sinhala: 'ය' },
  { name: 'ra', sinhala: 'ර' },
  { name: 'la', sinhala: 'ල' },
  { name: 'wa', sinhala: 'ව' },
  { name: 'sha', sinhala: 'ශ' },
  { name: 'sa', sinhala: 'ස' },
  { name: 'ha', sinhala: 'හ' },
]

export const SUPPORTED_LETTERS: Letter[] = LETTERS.map((letter) => ({
  ...letter,
  image: IMAGES[letter.name],
}))

const BY_NAME = new Map(SUPPORTED_LETTERS.map((letter) => [letter.name, letter]))

/** Find a letter from a model label, ignoring case and stray spaces ("Ma " -> ma). */
export function findLetter(label: string): Letter | undefined {
  return BY_NAME.get(label.trim().toLowerCase())
}

if (import.meta.env.DEV) {
  for (const { name, image } of SUPPORTED_LETTERS) {
    if (!image) console.warn(`letters: no image found for "${name}" in src/assets/letters/`)
  }
}
