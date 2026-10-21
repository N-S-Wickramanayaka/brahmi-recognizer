import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { MAX_IMAGE_EDGE, recognizeCharacter, type Prediction } from '../config'
import PredictionsPanel from './PredictionsPanel'
import SupportedLetters from './SupportedLetters'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const SERVICE_ERROR =
  'Unable to reach the recognition service. Please try again later.'

async function downscaleImage(file: File, maxEdge = MAX_IMAGE_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), mime, 0.9)
  })
  return blob ?? file
}

function Spinner({ waking }: { waking: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-sand border-t-bronze" />
      <p className="font-serif text-xl italic text-ink">
        {waking
          ? 'Waking up the model... this may take up to 60 seconds'
          : 'Analyzing inscription...'}
      </p>
      {!waking && <p className="text-base text-muted">This may take a few moments.</p>}
    </div>
  )
}

export default function UploadSection() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isWaking, setIsWaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasImage = Boolean(previewUrl)

  const reset = useCallback(() => {
    setPredictions([])
    setError(null)
    setIsLoading(false)
    setIsWaking(false)
    setIsDragging(false)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (!ACCEPT.includes(file.type) && !file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, or WebP).')
      return
    }

    setError(null)
    setPredictions([])
    setIsWaking(false)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setIsLoading(true)

    try {
      const payload = await downscaleImage(file)
      const result = await recognizeCharacter(payload, () => setIsWaking(true))
      setPredictions(result)
    } catch {
      setError(SERVICE_ERROR)
    } finally {
      setIsLoading(false)
      setIsWaking(false)
    }
  }, [])

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void processFile(file)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement | HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const onDragOver = (event: DragEvent<HTMLButtonElement | HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const frameTone = error
    ? 'border-oxblood/50'
    : isDragging
      ? 'border-bronze'
      : 'border-verdigris/60'

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="text-center">
        <h2 className="font-serif text-[2rem] font-medium leading-tight text-ink sm:text-[2.5rem]">
          Upload an inscription
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
          Drop a photograph or rubbing of an Early Brahmi character. The model
          returns a ranked list of likely classes.
        </p>
      </div>

      <SupportedLetters />

      <div className="mt-10">
        {!hasImage ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setIsDragging(false)}
            className="group block w-full border border-rule bg-paper p-2.5 text-center sm:p-3"
          >
            <span
              className={`flex flex-col items-center border border-dashed px-6 py-14 transition-colors duration-300 sm:py-20 ${
                isDragging
                  ? 'border-bronze bg-linen'
                  : 'border-bronze-light group-hover:border-bronze group-hover:bg-linen/60'
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-bronze-light text-bronze transition-colors duration-300 group-hover:border-bronze">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-7.5L12 3m0 0 4.5 6m-4.5-6v12.75"
                  />
                </svg>
              </span>
              <span className="mt-5 font-serif text-2xl text-ink">Drop an image here</span>
              <span className="mt-1 text-lg italic text-muted">
                or click to browse from your device
              </span>
              <span className="mt-5 text-sm text-muted">JPEG, PNG or WebP</span>
            </span>
          </button>
        ) : (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setIsDragging(false)}
            className={`plate p-5 transition-colors duration-300 sm:p-8 ${frameTone}`}
          >
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <figure className="m-0">
                <div className="border border-rule bg-linen p-2">
                  <img
                    src={previewUrl ?? ''}
                    alt="Uploaded inscription"
                    className="mx-auto max-h-[420px] w-full object-contain"
                  />
                </div>
                <figcaption className="mt-2 text-center text-base italic text-muted">
                  Your upload
                </figcaption>
              </figure>

              <div className="min-h-[260px]">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Spinner waking={isWaking} />
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      role="alert"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex h-full min-h-[220px] flex-col items-center justify-center border border-oxblood/30 bg-oxblood/[0.04] p-8 text-center"
                    >
                      <p className="font-serif text-xl text-oxblood">{error}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preds"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <PredictionsPanel predictions={predictions} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-8 flex justify-center border-t border-rule pt-6">
              <button
                type="button"
                onClick={reset}
                className="border border-bronze bg-paper px-7 py-2 font-serif text-lg text-ink transition-colors duration-200 hover:bg-bronze hover:text-paper"
              >
                Try another image
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    </section>
  )
}
