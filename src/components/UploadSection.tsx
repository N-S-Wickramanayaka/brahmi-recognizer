import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { recognizeCharacter, type Prediction } from '../config'
import { cropImage, cropToPixels, type CropRect, type PreparedImage } from '../crop'
import { pickExamples, type ExamplePhoto } from '../examples'
import { planOutput } from '../imageProcessing'
import ExamplePhotos from './ExamplePhotos'
import ImageCropper from './ImageCropper'
import PredictionsPanel from './PredictionsPanel'
import SupportedLetters from './SupportedLetters'

const SERVICE_ERROR =
  'Unable to reach the recognition service. Please try again later.'
const NOT_AN_IMAGE = 'That file isn’t an image. Choose a JPEG, PNG or WebP file.'
const UNREADABLE_IMAGE =
  'This image can’t be opened in the browser. Try saving it as a JPEG or PNG first.'

/** pick an image → select the letter → see the predictions */
type Stage = 'pick' | 'crop' | 'result'

type Analyzed = Omit<PreparedImage, 'blob'> & {
  /** Preview of the exact image sent to the model. */
  url: string
  cropped: boolean
}

type Size = { width: number; height: number }

/** "Selection: 80 × 96 px · will be enlarged to 224 × 269 and sharpened", updated live. */
function SelectionSize({ size, crop }: { size: Size; crop: CropRect | null }) {
  const area = cropToPixels(crop, size.width, size.height)
  const plan = planOutput(area.width, area.height)
  return (
    <div className="mt-3 text-center text-base leading-relaxed">
      <p className="text-muted">
        {crop ? 'Selection' : 'Whole image'}:{' '}
        <span className="whitespace-nowrap tabular-nums lining-nums">
          {area.width} × {area.height} px
        </span>
        {plan.enlarged && (
          <>
            {' '}
            · will be enlarged to{' '}
            <span className="whitespace-nowrap tabular-nums lining-nums">
              {plan.width} × {plan.height}
            </span>
            {plan.sharpen ? ' and sharpened' : ''}
          </>
        )}
      </p>
      {plan.verySmall && (
        <p className="mt-1 text-oxblood">
          That&rsquo;s very small, so the result may be less reliable. A closer photo of the
          letter will work better.
        </p>
      )}
    </div>
  )
}

type Source = {
  url: string
  type: string
  /** Set when the image is one of the built-in example photos. */
  exampleId?: string
}

const secondaryButton =
  'w-full border border-bronze bg-paper px-7 py-2 font-serif text-lg text-ink transition-colors duration-200 hover:bg-bronze hover:text-paper sm:w-auto'
const primaryButton =
  'w-full border border-bronze bg-bronze px-7 py-2 font-serif text-lg text-paper transition-colors duration-200 hover:border-ink hover:bg-ink sm:w-auto'

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
  // Bumped whenever the visitor moves on, so a slow reply for an old image is ignored.
  const requestRef = useRef(0)

  const [stage, setStage] = useState<Stage>('pick')
  const [isDragging, setIsDragging] = useState(false)
  const [source, setSource] = useState<Source | null>(null)
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [analyzed, setAnalyzed] = useState<Analyzed | null>(null)
  const [imageSize, setImageSize] = useState<Size | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isWaking, setIsWaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Free the browser's copy of an image once it's no longer shown.
  useEffect(() => () => {
    // Example photos are site assets, not browser copies, so there's nothing to free.
    if (source?.url.startsWith('blob:')) URL.revokeObjectURL(source.url)
  }, [source])
  useEffect(() => () => {
    if (analyzed) URL.revokeObjectURL(analyzed.url)
  }, [analyzed])

  const clearResult = () => {
    requestRef.current += 1
    setAnalyzed(null)
    setPredictions([])
    setError(null)
    setIsLoading(false)
    setIsWaking(false)
  }

  const reset = () => {
    clearResult()
    setSource(null)
    setImageSize(null)
    setCrop(null)
    setIsDragging(false)
    setStage('pick')
  }

  const processFile = (file: File) => {
    if (inputRef.current) inputRef.current.value = ''
    if (!file.type.startsWith('image/')) {
      setError(NOT_AN_IMAGE)
      return
    }
    clearResult()
    setSource({ url: URL.createObjectURL(file), type: file.type })
    setImageSize(null)
    setCrop(null)
    setStage('crop')
  }

  const analyze = async (image: Source, area: CropRect | null) => {
    const id = ++requestRef.current
    setError(null)
    setAnalyzed(null)
    setPredictions([])
    setIsWaking(false)
    setIsLoading(true)
    setStage('result')

    let prepared: PreparedImage
    try {
      prepared = await cropImage(image.url, image.type, area)
    } catch {
      if (id === requestRef.current) {
        setIsLoading(false)
        setError(UNREADABLE_IMAGE)
      }
      return
    }
    if (id !== requestRef.current) return
    const { blob: payload, ...details } = prepared
    setAnalyzed({ ...details, url: URL.createObjectURL(payload), cropped: area !== null })

    try {
      const result = await recognizeCharacter(payload, () => {
        if (id === requestRef.current) setIsWaking(true)
      })
      if (id === requestRef.current) setPredictions(result)
    } catch {
      if (id === requestRef.current) setError(SERVICE_ERROR)
    } finally {
      if (id === requestRef.current) {
        setIsLoading(false)
        setIsWaking(false)
      }
    }
  }

  /** Example photos are already cropped to one letter, so they go straight to analysis. */
  const tryExample = (photo: ExamplePhoto) => {
    const image: Source = { url: photo.url, type: photo.type, exampleId: photo.id }
    setSource(image)
    setImageSize(null)
    setCrop(null)
    void analyze(image, null)
  }

  const tryAnotherExample = () => {
    const [next] = pickExamples(1, source?.exampleId ? [source.exampleId] : [])
    if (next) tryExample(next)
  }

  const adjustSelection = () => {
    clearResult()
    setStage('crop')
  }

  const onImageError = () => {
    reset()
    setError(UNREADABLE_IMAGE)
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const dropProps = {
    onDrop,
    onDragOver,
    onDragLeave: () => setIsDragging(false),
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
        {stage === 'pick' && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              {...dropProps}
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
            {error && (
              <p role="alert" className="mt-4 text-center text-lg text-oxblood">
                {error}
              </p>
            )}
            <ExamplePhotos onPick={tryExample} />
          </>
        )}

        {stage === 'crop' && source && (
          <div {...dropProps} className="plate px-3 py-5 sm:p-8">
            <div className="text-center">
              <h3 className="font-serif text-2xl font-medium text-ink">Select the letter</h3>
              <p className="mx-auto mt-1 max-w-lg px-2 text-base leading-relaxed text-muted">
                Drag across the letter you want identified. You can then move the box,
                or drag its corners and edges to fit it more closely.
              </p>
            </div>

            <div className="mt-6 border border-rule bg-linen p-2 sm:p-4">
              <ImageCropper
                src={source.url}
                crop={crop}
                onChange={setCrop}
                onError={onImageError}
                onImageLoad={setImageSize}
              />
            </div>
            {imageSize && <SelectionSize size={imageSize} crop={crop} />}

            <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-rule pt-6">
              <button type="button" onClick={() => void analyze(source, crop)} className={primaryButton}>
                {crop ? 'Analyze selection' : 'Analyze whole image'}
              </button>
              {crop && (
                <button type="button" onClick={() => setCrop(null)} className={secondaryButton}>
                  Clear selection
                </button>
              )}
              <button type="button" onClick={reset} className={secondaryButton}>
                Choose another image
              </button>
            </div>
          </div>
        )}

        {stage === 'result' && source && (
          <div
            {...dropProps}
            className={`plate p-5 transition-colors duration-300 sm:p-8 ${frameTone}`}
          >
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <figure className="m-0">
                <div className="border border-rule bg-linen p-2">
                  {analyzed ? (
                    <img
                      src={analyzed.url}
                      alt={
                        analyzed.cropped
                          ? 'The selected part of the image'
                          : source.exampleId
                            ? 'Example photo'
                            : 'Uploaded inscription'
                      }
                      className="mx-auto max-h-[420px] w-full object-contain"
                    />
                  ) : (
                    <div className="aspect-square max-h-[420px] w-full" />
                  )}
                </div>
                <figcaption className="mt-2 text-center text-base text-muted">
                  <span className="italic">
                    {analyzed?.cropped
                      ? 'Your selection'
                      : source.exampleId
                        ? 'Example photo'
                        : 'Your upload'}
                  </span>
                  {analyzed?.plan.enlarged && (
                    <span className="mt-0.5 block text-sm">
                      Enlarged {analyzed.plan.scale.toFixed(1)}× from{' '}
                      <span className="whitespace-nowrap tabular-nums lining-nums">
                        {analyzed.sourceWidth} × {analyzed.sourceHeight} px
                      </span>
                      {analyzed.plan.sharpen ? ' and sharpened' : ''} for the model
                    </span>
                  )}
                  {analyzed?.plan.verySmall && (
                    <span className="mt-0.5 block text-sm text-oxblood">
                      This was a very small area, so treat the result with caution.
                    </span>
                  )}
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

            <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-rule pt-6">
              <button type="button" onClick={adjustSelection} className={secondaryButton}>
                Adjust selection
              </button>
              {source.exampleId && (
                <button type="button" onClick={tryAnotherExample} className={secondaryButton}>
                  Try another example
                </button>
              )}
              <button type="button" onClick={reset} className={secondaryButton}>
                Choose another image
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
