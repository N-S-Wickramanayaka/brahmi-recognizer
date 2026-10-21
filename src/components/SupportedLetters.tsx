import { SUPPORTED_LETTERS } from '../letters'

export default function SupportedLetters() {
  return (
    <div className="mt-10">
      <p className="text-center text-lg italic text-ink-soft">
        The model currently recognizes only these characters
      </p>

      {/* 4 per row on phones, 5 on tablets, 8 on desktop; a short last row stays centered. */}
      <ul className="mx-auto mt-5 flex max-w-[36rem] flex-wrap justify-center gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:max-w-none lg:gap-x-5">
        {SUPPORTED_LETTERS.map((letter) => (
          <li
            key={letter.name}
            className="w-[calc((100%-2.25rem)/4)] sm:w-[calc((100%-4rem)/5)] lg:w-[calc((100%-8.75rem)/8)]"
          >
            <figure className="m-0">
              <div className="border border-rule bg-paper p-1 sm:p-1.5">
                {letter.image ? (
                  <img
                    src={letter.image}
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
        ))}
      </ul>
    </div>
  )
}
