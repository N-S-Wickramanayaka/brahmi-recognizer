import {
  MAX_IMAGE_EDGE,
  MODEL_INPUT_SIZE,
  SHARPEN_ENLARGED_IMAGES,
  VERY_SMALL_EDGE,
} from './config'

/*
 * Prepares the image that is sent to the model.
 *
 * Small crops are enlarged so their shorter side reaches MODEL_INPUT_SIZE, using
 * a Lanczos-3 filter (sharper than the bilinear resize the server or the browser
 * would otherwise use), then given an unsharp mask whose strength grows with the
 * enlargement. The settings were tuned by shrinking the 224 × 224 reference
 * samples to small-crop sizes, enlarging them back, and scoring the result
 * (SSIM) against the originals.
 */

export type SharpenSettings = {
  /** Blur radius of the unsharp mask, in output pixels. */
  sigma: number
  /** How much of the detail layer is added back (0 = none). */
  amount: number
  /** Differences smaller than this (0–255) are left alone, so stone grain and JPEG noise aren't amplified. */
  threshold: number
}

export type OutputPlan = {
  width: number
  height: number
  /** Output size ÷ selection size. Above 1 means the selection is enlarged. */
  scale: number
  enlarged: boolean
  sharpen: SharpenSettings | null
  /** The selection is so small that even after enlarging there is little detail to read. */
  verySmall: boolean
}

/** Sharpening grows from nothing at 1.5× enlargement to its maximum at 3.5× and above. */
export function sharpenSettings(scale: number): SharpenSettings | null {
  const amount = Math.min(0.5, Math.max(0, (scale - 1.5) * 0.25))
  if (amount < 0.02) return null
  return { sigma: Math.min(3, Math.max(1, 0.8 * scale)), amount, threshold: 2 }
}

/** Work out the size of the image sent to the model for a selection of this size. */
export function planOutput(sourceWidth: number, sourceHeight: number): OutputPlan {
  const shortEdge = Math.min(sourceWidth, sourceHeight)
  const longEdge = Math.max(sourceWidth, sourceHeight)

  let scale = shortEdge < MODEL_INPUT_SIZE ? MODEL_INPUT_SIZE / shortEdge : 1
  if (longEdge * scale > MAX_IMAGE_EDGE) scale = MAX_IMAGE_EDGE / longEdge

  const enlarged = scale > 1.001
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
    enlarged,
    sharpen: enlarged && SHARPEN_ENLARGED_IMAGES ? sharpenSettings(scale) : null,
    verySmall: shortEdge < VERY_SMALL_EDGE,
  }
}

function lanczos3(x: number): number {
  if (x === 0) return 1
  if (x <= -3 || x >= 3) return 0
  const px = Math.PI * x
  return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px)
}

/** For each output pixel along one axis: which input pixels it reads, and with what weights. */
function buildTaps(inSize: number, outSize: number) {
  const scale = outSize / inSize
  const filterScale = Math.min(1, scale) // widen the filter when shrinking
  const support = 3 / filterScale
  const taps = Math.ceil(support) * 2
  const index = new Int32Array(outSize * taps)
  const weight = new Float32Array(outSize * taps)

  for (let i = 0; i < outSize; i++) {
    const center = (i + 0.5) / scale - 0.5
    const first = Math.floor(center - support) + 1
    let sum = 0
    for (let t = 0; t < taps; t++) {
      const j = first + t
      const w = lanczos3((center - j) * filterScale)
      index[i * taps + t] = Math.min(Math.max(j, 0), inSize - 1)
      weight[i * taps + t] = w
      sum += w
    }
    for (let t = 0; t < taps; t++) weight[i * taps + t] /= sum
  }
  return { taps, index, weight }
}

/** Lanczos-3 resize of RGBA pixels into an RGB float buffer (values roughly 0–255). */
function resizeLanczos(src: ImageData, width: number, height: number): Float32Array {
  const { width: sw, height: sh, data } = src
  const h = buildTaps(sw, width)
  const v = buildTaps(sh, height)

  // Horizontal pass: sh rows × width columns.
  const mid = new Float32Array(sh * width * 3)
  for (let y = 0; y < sh; y++) {
    const row = y * sw
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let t = 0; t < h.taps; t++) {
        const k = x * h.taps + t
        const w = h.weight[k]
        const p = (row + h.index[k]) * 4
        r += data[p] * w
        g += data[p + 1] * w
        b += data[p + 2] * w
      }
      const o = (y * width + x) * 3
      mid[o] = r
      mid[o + 1] = g
      mid[o + 2] = b
    }
  }

  // Vertical pass: height rows × width columns.
  const out = new Float32Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let t = 0; t < v.taps; t++) {
        const k = y * v.taps + t
        const w = v.weight[k]
        const p = (v.index[k] * width + x) * 3
        r += mid[p] * w
        g += mid[p + 1] * w
        b += mid[p + 2] * w
      }
      const o = (y * width + x) * 3
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
    }
  }
  return out
}

/** Separable Gaussian blur of a single-channel image, clamping at the edges. */
function gaussianBlur(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const radius = Math.ceil(sigma * 3)
  const kernel = new Float32Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + radius] = w
    sum += w
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum

  const tmp = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let i = -radius; i <= radius; i++) {
        const xx = Math.min(Math.max(x + i, 0), width - 1)
        acc += src[y * width + xx] * kernel[i + radius]
      }
      tmp[y * width + x] = acc
    }
  }
  const out = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let i = -radius; i <= radius; i++) {
        const yy = Math.min(Math.max(y + i, 0), height - 1)
        acc += tmp[yy * width + x] * kernel[i + radius]
      }
      out[y * width + x] = acc
    }
  }
  return out
}

/**
 * Unsharp mask on brightness only, so strokes get crisper without colour
 * fringes. Changes the RGB buffer in place.
 */
function unsharpMask(rgb: Float32Array, width: number, height: number, settings: SharpenSettings) {
  const count = width * height
  const lum = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    lum[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]
  }
  const blurred = gaussianBlur(lum, width, height, settings.sigma)
  for (let i = 0; i < count; i++) {
    const detail = lum[i] - blurred[i]
    const kept = Math.sign(detail) * Math.max(Math.abs(detail) - settings.threshold, 0)
    const add = settings.amount * kept
    rgb[i * 3] += add
    rgb[i * 3 + 1] += add
    rgb[i * 3 + 2] += add
  }
}

/** Enlarge (and, if the plan says so, sharpen) the pixels of a selection. */
export function enlargeImage(src: ImageData, plan: OutputPlan): ImageData {
  const rgb = resizeLanczos(src, plan.width, plan.height)
  if (plan.sharpen) unsharpMask(rgb, plan.width, plan.height, plan.sharpen)

  const out = new ImageData(plan.width, plan.height)
  for (let i = 0, count = plan.width * plan.height; i < count; i++) {
    out.data[i * 4] = Math.round(Math.min(255, Math.max(0, rgb[i * 3])))
    out.data[i * 4 + 1] = Math.round(Math.min(255, Math.max(0, rgb[i * 3 + 1])))
    out.data[i * 4 + 2] = Math.round(Math.min(255, Math.max(0, rgb[i * 3 + 2])))
    out.data[i * 4 + 3] = 255
  }
  return out
}
