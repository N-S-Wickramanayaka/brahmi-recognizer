import { MAX_IMAGE_EDGE } from './config'

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

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = url
  return image.decode().then(() => image)
}

/**
 * Cut the selected area out of the image and shrink it so its longest edge is
 * at most `maxEdge`. Drawing from an <img> keeps phone photos the right way up
 * (browsers apply the photo's EXIF rotation), so the crop matches what the
 * visitor saw on screen.
 */
export async function cropImage(
  url: string,
  mimeType: string,
  crop: CropRect | null,
  maxEdge = MAX_IMAGE_EDGE,
): Promise<Blob> {
  const image = await loadImage(url)
  const area = crop ?? FULL_IMAGE

  const sx = Math.round(area.x * image.naturalWidth)
  const sy = Math.round(area.y * image.naturalHeight)
  const sw = Math.max(1, Math.round(area.width * image.naturalWidth))
  const sh = Math.max(1, Math.round(area.height * image.naturalHeight))

  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)

  const outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.92)
  })
  if (!blob) throw new Error('Could not encode the cropped image')
  return blob
}
