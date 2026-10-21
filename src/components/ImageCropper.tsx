import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { clamp, type CropRect } from '../crop'

type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

type Drag =
  | { mode: 'draw'; pointerId: number; originX: number; originY: number; before: CropRect | null; last: CropRect | null }
  | { mode: 'move'; pointerId: number; startX: number; startY: number; start: CropRect }
  | { mode: 'resize'; pointerId: number; handle: Handle; start: CropRect }

type ImageCropperProps = {
  src: string
  crop: CropRect | null
  onChange: (crop: CropRect | null) => void
  onError?: () => void
}

/** Smallest selection, in screen pixels. */
const MIN_SIZE_PX = 16
/** A press that moves less than this is a tap, not a new selection. */
const TAP_PX = 6

const EDGES: { handle: Handle; className: string }[] = [
  { handle: 'n', className: '-top-2 left-4 right-4 h-4 cursor-ns-resize' },
  { handle: 's', className: '-bottom-2 left-4 right-4 h-4 cursor-ns-resize' },
  { handle: 'w', className: '-left-2 top-4 bottom-4 w-4 cursor-ew-resize' },
  { handle: 'e', className: '-right-2 top-4 bottom-4 w-4 cursor-ew-resize' },
]

const CORNERS: { handle: Handle; className: string }[] = [
  { handle: 'nw', className: '-left-4 -top-4 cursor-nwse-resize' },
  { handle: 'ne', className: '-right-4 -top-4 cursor-nesw-resize' },
  { handle: 'sw', className: '-bottom-4 -left-4 cursor-nesw-resize' },
  { handle: 'se', className: '-bottom-4 -right-4 cursor-nwse-resize' },
]

function withMinSize(rect: CropRect, minWidth: number, minHeight: number): CropRect {
  const width = Math.min(1, Math.max(rect.width, minWidth))
  const height = Math.min(1, Math.max(rect.height, minHeight))
  return {
    x: clamp(rect.x - (width - rect.width) / 2, 0, 1 - width),
    y: clamp(rect.y - (height - rect.height) / 2, 0, 1 - height),
    width,
    height,
  }
}

export default function ImageCropper({ src, crop, onChange, onError }: ImageCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)

  const locate = (event: PointerEvent) => {
    const rect = frameRef.current!.getBoundingClientRect()
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      minWidth: MIN_SIZE_PX / rect.width,
      minHeight: MIN_SIZE_PX / rect.height,
      rect,
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (dragRef.current || !frameRef.current) return

    const target = event.target as HTMLElement
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | undefined
    const onSelection = Boolean(target.closest('[data-selection]'))
    const { x, y } = locate(event)
    const { pointerId } = event

    if (crop && handle) {
      dragRef.current = { mode: 'resize', pointerId, handle, start: crop }
    } else if (crop && onSelection) {
      dragRef.current = { mode: 'move', pointerId, startX: x, startY: y, start: crop }
    } else {
      dragRef.current = { mode: 'draw', pointerId, originX: x, originY: y, before: crop, last: null }
    }
    frameRef.current.setPointerCapture(pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const { x, y, minWidth, minHeight } = locate(event)

    if (drag.mode === 'draw') {
      const next = {
        x: Math.min(drag.originX, x),
        y: Math.min(drag.originY, y),
        width: Math.abs(x - drag.originX),
        height: Math.abs(y - drag.originY),
      }
      drag.last = next
      onChange(next)
      return
    }

    if (drag.mode === 'move') {
      const { start } = drag
      onChange({
        ...start,
        x: clamp(start.x + x - drag.startX, 0, 1 - start.width),
        y: clamp(start.y + y - drag.startY, 0, 1 - start.height),
      })
      return
    }

    const { start, handle } = drag
    let left = start.x
    let top = start.y
    let right = start.x + start.width
    let bottom = start.y + start.height
    if (handle.includes('w')) left = clamp(x, 0, right - minWidth)
    if (handle.includes('e')) right = clamp(x, left + minWidth, 1)
    if (handle.includes('n')) top = clamp(y, 0, bottom - minHeight)
    if (handle.includes('s')) bottom = clamp(y, top + minHeight, 1)
    onChange({ x: left, y: top, width: right - left, height: bottom - top })
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.mode !== 'draw') return

    const { minWidth, minHeight, rect } = locate(event)
    const last = drag.last
    const isTap =
      !last || Math.max(last.width * rect.width, last.height * rect.height) < TAP_PX
    // A tap keeps whatever was selected before; a real drag gets a usable minimum size.
    onChange(isTap ? drag.before : withMinSize(last, minWidth, minHeight))
  }

  const onSelectionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!crop) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onChange(null)
      return
    }
    const step = event.shiftKey ? 0.05 : 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    onChange({
      ...crop,
      x: clamp(crop.x + move[0], 0, 1 - crop.width),
      y: clamp(crop.y + move[1], 0, 1 - crop.height),
    })
  }

  const position: CSSProperties | undefined = crop
    ? {
        left: `${crop.x * 100}%`,
        top: `${crop.y * 100}%`,
        width: `${crop.width * 100}%`,
        height: `${crop.height * 100}%`,
      }
    : undefined

  return (
    <div className="flex justify-center">
      <div
        ref={frameRef}
        className="relative max-w-full cursor-crosshair touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <img
          src={src}
          alt="Your upload"
          draggable={false}
          onError={onError}
          className="block max-h-[min(65vh,560px)] max-w-full"
        />

        {crop && (
          <>
            {/* Dims everything outside the selection. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute shadow-[0_0_0_9999px_rgba(42,32,25,0.6)]" style={position} />
            </div>

            <div
              data-selection
              tabIndex={0}
              role="group"
              aria-label="Selected area. Use the arrow keys to move it, or Escape to clear it."
              onKeyDown={onSelectionKeyDown}
              className="absolute cursor-move border border-paper shadow-[0_0_0_1px_rgba(42,32,25,0.35)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-light"
              style={position}
            >
              {EDGES.map(({ handle, className }) => (
                <span key={handle} data-handle={handle} className={`absolute ${className}`} />
              ))}
              {CORNERS.map(({ handle, className }) => (
                <span key={handle} data-handle={handle} className={`absolute h-8 w-8 ${className}`}>
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border border-bronze bg-paper" />
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
