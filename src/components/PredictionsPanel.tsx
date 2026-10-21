import { motion } from 'framer-motion'
import type { Prediction } from '../config'
import { findLetter } from '../letters'

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

  const topLetter = findLetter(top.label)

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-lg italic text-bronze">Top prediction</p>
      <div className="mt-2 flex items-center gap-5 border-b border-rule pb-4">
        {topLetter?.image && (
          <figure className="m-0 w-24 shrink-0 sm:w-28">
            <div className="border border-rule bg-paper p-1">
              <img
                src={topLetter.image}
                alt={`Reference sample of the Brahmi character ${topLetter.name}`}
                width={224}
                height={224}
                className="block aspect-square w-full object-cover"
              />
            </div>
            <figcaption className="mt-1 text-center text-sm italic leading-snug text-muted">
              Reference
            </figcaption>
          </figure>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className="flex flex-wrap items-baseline gap-x-3 font-serif text-5xl font-medium leading-none text-ink [overflow-wrap:anywhere] sm:text-7xl">
            <span className="capitalize">{top.label}</span>
            {topLetter && (
              <span className="font-sinhala text-4xl font-medium text-bronze sm:text-5xl" lang="si">
                {topLetter.sinhala}
              </span>
            )}
          </h3>
          <p className="text-2xl tabular-nums lining-nums text-bronze">
            {formatPercent(top.confidence)}
          </p>
        </div>
      </div>

      <p className="mt-6 text-lg italic text-bronze">Top-5 candidates</p>
      <ol className="mt-2 divide-y divide-rule/70">
        {topFive.map((item, index) => {
          const isTop = index === 0
          const letter = findLetter(item.label)
          return (
            <li
              key={`${item.label}-${index}`}
              className="grid grid-cols-[1.75rem_2.75rem_1fr_3.75rem] items-center gap-x-3 py-2.5"
            >
              <span className="text-base italic text-muted">{RANKS[index]}.</span>
              <span className="block border border-rule bg-paper p-0.5">
                {letter?.image ? (
                  <img
                    src={letter.image}
                    alt=""
                    width={224}
                    height={224}
                    className="block aspect-square w-full object-cover"
                  />
                ) : (
                  <span className="block aspect-square w-full bg-linen" />
                )}
              </span>
              <div className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span
                    className={`truncate capitalize ${isTop ? 'font-medium text-ink' : 'text-ink-soft'}`}
                  >
                    {item.label}
                  </span>
                  {letter && (
                    <span className="font-sinhala text-lg font-medium text-bronze" lang="si">
                      {letter.sinhala}
                    </span>
                  )}
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
              <span className={`text-right tabular-nums lining-nums ${isTop ? 'text-ink' : 'text-muted'}`}>
                {formatPercent(item.confidence)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
