import { enlargeImage, planOutput, type OutputPlan } from './imageProcessing'

/**
 * A selection on the image, as fractions (0–1) of the image's width and height,
 * so it stays correct whatever size the image is displayed at.
 */
export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

export const FULL_IMAGE: CropRect = { x: 0, y: 0, width: 1, height: 1 }

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** The selection in the photo's own pixels. */
export function cropToPixels(crop: CropRect | null, imageWidth: number, imageHeight: number) {
  const area = crop ?? FULL_IMAGE
  return {
    x: Math.round(area.x * imageWidth),
    y: Math.round(area.y * imageHeight),
    width: Math.max(1, Math.round(area.width * imageWidth)),
    height: Math.max(1, Math.round(area.height * imageHeight)),
  }
}

/** The image that is sent to the model, and how it was made. */
export type PreparedImage = {
  blob: Blob
  /** Size of the selection in the original photo. */
  sourceWidth: number
  sourceHeight: number
  plan: OutputPlan
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = url
  return image.decode().then(() => image)
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      type,
      0.92,
    )
  })
}

/**
 * Cut the selected area out of the image and size it for the model: large
 * selections are shrunk to at most MAX_IMAGE_EDGE, small ones are enlarged to
 * MODEL_INPUT_SIZE and sharpened (see imageProcessing.ts). Drawing from an <img>
 * keeps phone photos the right way up (browsers apply the photo's EXIF
 * rotation), so the crop matches what the visitor saw on screen.
 */
export async function cropImage(
  url: string,
  mimeType: string,
  crop: CropRect | null,
): Promise<PreparedImage> {
  const image = await loadImage(url)
  const source = cropToPixels(crop, image.naturalWidth, image.naturalHeight)
  const plan = planOutput(source.width, source.height)

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: plan.enlarged })
  if (!context) throw new Error('Canvas is not available')

  let outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'

  if (plan.enlarged) {
    // Copy the selection pixel for pixel, then enlarge it ourselves.
    canvas.width = source.width
    canvas.height = source.height
    context.drawImage(
      image,
      source.x, source.y, source.width, source.height,
      0, 0, source.width, source.height,
    )
    const pixels = context.getImageData(0, 0, source.width, source.height)
    canvas.width = plan.width
    canvas.height = plan.height
    context.putImageData(enlargeImage(pixels, plan), 0, 0)
    // Lossless, so JPEG compression doesn't put back the blockiness we just smoothed out.
    outputType = 'image/png'
  } else {
    canvas.width = plan.width
    canvas.height = plan.height
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      source.x, source.y, source.width, source.height,
      0, 0, plan.width, plan.height,
    )
  }

  return {
    blob: await toBlob(canvas, outputType),
    sourceWidth: source.width,
    sourceHeight: source.height,
    plan,
  }
}
