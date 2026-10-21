export const API_URL = import.meta.env.DEV
  ? "/api/predict"
  : "https://anna-kurera--visformer-api-visformermodel-serve.modal.run/predict"
/**
 * Request body format. Switch this if the deployed model expects JSON instead of a file.
 * - "multipart": FormData with the image field (default)
 * - "json": JSON body with raw base64 (no data URL prefix)
 */
export const API_PAYLOAD: 'multipart' | 'json' = 'json'

/** Form field / JSON key that holds the image. */
export const API_IMAGE_FIELD = 'image'

/** Longest edge used when downscaling before upload. */
export const MAX_IMAGE_EDGE = 1024

export type Prediction = {
  label: string
  confidence: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asLabel(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function normalizeConfidence(raw: number): number {
  // Accept both 0–1 probabilities and 0–100 percentages.
  if (raw > 1 && raw <= 100) return raw / 100
  return Math.min(Math.max(raw, 0), 1)
}

function parsePredictionItem(item: unknown): Prediction | null {
  if (typeof item === 'string') {
    return { label: item, confidence: 0 }
  }
  if (!isRecord(item)) return null

  const label =
    asLabel(item.label) ??
    asLabel(item.class) ??
    asLabel(item.class_name) ??
    asLabel(item.className) ??
    asLabel(item.name) ??
    asLabel(item.character) ??
    asLabel(item.prediction)

  const confidenceRaw =
    asNumber(item.confidence) ??
    asNumber(item.score) ??
    asNumber(item.probability) ??
    asNumber(item.prob) ??
    asNumber(item.p)

  if (!label || confidenceRaw === null) return null
  return { label, confidence: normalizeConfidence(confidenceRaw) }
}

function extractPredictionList(payload: unknown): Prediction[] | unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  const nestedKeys = [
    'predictions',
    'results',
    'top_k',
    'topk',
    'classes',
    'output',
    'data',
  ] as const

  for (const key of nestedKeys) {
    const value = payload[key]
    if (Array.isArray(value)) return value

    // Handle dictionary format: {"ClassName": 0.95, "OtherClass": 0.03}
    if (isRecord(value) && !Array.isArray(value)) {
      const entries = Object.entries(value)
      if (entries.length > 0 && entries.every(([, v]) => typeof v === 'number')) {
        return entries.map(([label, confidence]) => ({
          label,
          confidence: normalizeConfidence(confidence as number),
        }))
      }
    }

    if (isRecord(value) && Array.isArray(value.predictions)) {
      return value.predictions
    }
  }

  if (parsePredictionItem(payload)) return [payload]
  return []
}

/**
 * Normalize slightly different model response shapes into a sorted Top-K list.
 * Adapt this function if the live API uses a new schema.
 */
export function parsePredictions(payload: unknown): Prediction[] {
  const raw = extractPredictionList(payload)

  const items = raw
    .map((item) => {
      // Already a Prediction from dictionary parsing
      const existing = item as Prediction
      if (existing.label && typeof existing.confidence === 'number') {
        return existing
      }
      return parsePredictionItem(item)
    })
    .filter((item): item is Prediction => item !== null)
    .sort((a, b) => b.confidence - a.confidence)

  const seen = new Set<string>()
  const unique: Prediction[] = []
  for (const item of items) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to encode image'))
        return
      }
      const base64 = dataUrl.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to encode image'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to encode image'))
    reader.readAsDataURL(blob)
  })
}

const MAX_ATTEMPTS = 5
const RETRY_DELAY_MS = 10_000

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function recognizeCharacter(
  image: Blob,
  onRetry?: () => void,
): Promise<Prediction[]> {
  const base64 = await blobToBase64(image)
  console.log('Sending base64 length:', base64.length)
  console.log('First 50 chars:', base64.substring(0, 50))

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      if (response.ok) {
        const data: unknown = await response.json()
        const predictions = parsePredictions(data)
        if (predictions.length > 0) {
          return predictions
        }
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed, retrying in 10s...`, error)
    }

    if (attempt < MAX_ATTEMPTS) {
      onRetry?.()
      await wait(RETRY_DELAY_MS)
    }
  }

  throw new Error('Unable to reach the recognition service')
}
