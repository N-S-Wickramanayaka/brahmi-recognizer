import { useState } from 'react'
import { EXAMPLE_PHOTOS, pickExamples, type ExamplePhoto } from '../examples'

const SHOWN = 6

type ExamplePhotosProps = {
  onPick: (photo: ExamplePhoto) => void
}

/** A few example photos (a different random set each visit) that analyze with one click. */
export default function ExamplePhotos({ onPick }: ExamplePhotosProps) {
  const [shown, setShown] = useState(() => pickExamples(SHOWN))

  if (shown.length === 0) return null

  return (
    <div className="mt-8 text-center">
      <p className="text-lg italic text-ink-soft">No photo to hand? Try one of these examples.</p>

      <ul className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-3">
        {shown.map((photo, index) => (
          <li key={photo.id} className="w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3.75rem)/6)]">
            <button
              type="button"
              onClick={() => onPick(photo)}
              aria-label={`Analyze example photo ${index + 1}`}
              className="block w-full border border-rule bg-paper p-1 transition-colors duration-200 hover:border-bronze hover:bg-linen"
            >
              <img
                src={photo.thumb}
                alt=""
                width={192}
                height={192}
                loading="lazy"
                decoding="async"
                className="block aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {EXAMPLE_PHOTOS.length > SHOWN && (
        <button
          type="button"
          onClick={() => setShown((current) => pickExamples(SHOWN, current.map((photo) => photo.id)))}
          className="mt-4 text-base text-ink-soft underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-bronze hover:decoration-bronze"
        >
          Show different examples
        </button>
      )}
    </div>
  )
}
