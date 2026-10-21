// Every image in src/assets/letters/ is picked up automatically and matched
// to a letter by its file name (ka.webp -> "ka").
const imageFiles = import.meta.glob<string>('../assets/letters/*.{webp,png,jpg,jpeg}', {
  eager: true,
  import: 'default',
})

const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(imageFiles).map(([path, url]) => [
    path.split('/').pop()!.replace(/\.\w+$/, '').toLowerCase(),
    url,
  ]),
)

type SupportedLetter = {
  /** Romanized name. Must match the image file name and the label the model returns. */
  name: string
  /** Sinhala equivalent. */
  sinhala: string
}

// Listed in Brahmi/Sinhala alphabet order (the same order as the header frieze).
// To support a new character, add its image to src/assets/letters/ and a line here.
const SUPPORTED_LETTERS: SupportedLetter[] = [
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

if (import.meta.env.DEV) {
  for (const { name } of SUPPORTED_LETTERS) {
    if (!IMAGES[name]) console.warn(`SupportedLetters: no image found for "${name}" in src/assets/letters/`)
  }
}

export default function SupportedLetters() {
  return (
    <div className="mt-10">
      <p className="text-center text-lg italic text-ink-soft">
        The model currently recognizes only these characters
      </p>

      {/* 4 per row on phones, 5 on tablets, 8 on desktop; a short last row stays centered. */}
      <ul className="mx-auto mt-5 flex max-w-[36rem] flex-wrap justify-center gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:max-w-none lg:gap-x-5">
        {SUPPORTED_LETTERS.map((letter) => {
          const image = IMAGES[letter.name]
          return (
            <li
              key={letter.name}
              className="w-[calc((100%-2.25rem)/4)] sm:w-[calc((100%-4rem)/5)] lg:w-[calc((100%-8.75rem)/8)]"
            >
              <figure className="m-0">
                <div className="border border-rule bg-paper p-1 sm:p-1.5">
                  {image ? (
                    <img
                      src={image}
                      alt={`Brahmi character ${letter.name} (${letter.sinhala}) carved in stone`}
                      width={224}
                      height={224}
                      loading="lazy"
                      decoding="async"
                      className="block aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-linen" />
                  )}
                </div>
                <figcaption className="mt-2 flex items-baseline justify-center gap-2 leading-none">
                  <span className="font-serif text-lg text-ink sm:text-xl">{letter.name}</span>
                  <span className="font-sinhala text-xl font-medium text-bronze sm:text-2xl" lang="si">
                    {letter.sinhala}
                  </span>
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
