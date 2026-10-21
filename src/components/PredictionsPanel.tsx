import { motion } from 'framer-motion'
import type { Prediction } from '../config'

type PredictionsPanelProps = {
  predictions: Prediction[]
}

const RANKS = ['i', 'ii', 'iii', 'iv', 'v']

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export default function PredictionsPanel({ predictions }: PredictionsPanelProps) {
  const topFive = predictions.slice(0, 5)
  const top = topFive[0]

  if (!top) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center border border-dashed border-rule bg-linen/60 p-8 text-center text-lg italic text-muted">
        Predictions will appear here after analysis.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-lg italic text-bronze">Top prediction</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-4">
        <h3 className="font-serif text-6xl font-medium capitalize leading-none text-ink [overflow-wrap:anywhere] sm:text-7xl">
          {top.label}
        </h3>
        <p className="text-2xl tabular-nums lining-nums text-bronze">
          {formatPercent(top.confidence)}
        </p>
      </div>

      <p className="mt-6 text-lg italic text-bronze">Top-5 candidates</p>
      <ol className="mt-2 divide-y divide-rule/70">
        {topFive.map((item, index) => {
          const isTop = index === 0
          return (
            <li
              key={`${item.label}-${index}`}
              className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 py-2.5"
            >
              <span className="text-base italic text-muted">{RANKS[index]}.</span>
              <div className="min-w-0">
                <span
                  className={`block truncate capitalize ${
                    isTop ? 'font-medium text-ink' : 'text-ink-soft'
                  }`}
                >
                  {item.label}
                </span>
                <div className="mt-1.5 h-[3px] overflow-hidden bg-sand">
                  <motion.div
                    className={`progress-fill h-full ${isTop ? 'bg-bronze' : 'bg-muted/50'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.min(Math.max(item.confidence, 0.03), 1) }}
                    transition={{ duration: 0.7, delay: 0.08 * index, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <span className={`tabular-nums lining-nums ${isTop ? 'text-ink' : 'text-muted'}`}>
                {formatPercent(item.confidence)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
