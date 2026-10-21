import { motion } from 'framer-motion'
import { useState } from 'react'
import titleStone1200 from '../assets/images/title_stone_1200.webp'
import titleStone1664 from '../assets/images/title_stone_1664.webp'
import titleStone800 from '../assets/images/title_stone_800.webp'
import uopLogo from '../assets/images/uop_logo.png'

// Brahmi vowels (a, ā, i, ī, u, ū, e, o) followed by the consonants ka–ha,
// from the Unicode Brahmi block, shown as an inscribed band under the title.
const VOWELS = [0x11005, 0x11006, 0x11007, 0x11008, 0x11009, 0x1100a, 0x1100f, 0x11011]
const CONSONANTS = Array.from({ length: 0x11033 - 0x11013 + 1 }, (_, i) => 0x11013 + i)
const FRIEZE = [...VOWELS, ...CONSONANTS].map((cp) => String.fromCodePoint(cp))

export default function Header() {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <header className="bg-linen">
      <motion.div
        className="mx-auto max-w-4xl px-6 pb-12 pt-10 text-center sm:px-8 sm:pb-16 sm:pt-14"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="flex justify-center">
          {logoFailed ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-bronze bg-paper font-display text-xs font-semibold text-bronze sm:h-20 sm:w-20">
              UoP
            </div>
          ) : (
            <img
              src={uopLogo}
              alt="University of Peradeniya"
              className="h-16 w-auto object-contain sm:h-20"
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>

        {/* The title is carved into a stone tablet, mounted like the other plates on the page. */}
        <h1 className="plate -mx-2 mt-7 p-2 sm:mx-auto sm:mt-9 sm:p-3">
          <img
            src={titleStone1200}
            srcSet={`${titleStone800} 800w, ${titleStone1200} 1200w, ${titleStone1664} 1664w`}
            sizes="(min-width: 896px) 808px, calc(100vw - 3.25rem)"
            width={2172}
            height={724}
            alt="Brahmi Character Recognizer"
            fetchPriority="high"
            decoding="async"
            className="block h-auto w-full"
          />
        </h1>

        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
          AI-powered recognition of Early Brahmi inscriptions — a research
          project by the University of Peradeniya
        </p>
      </motion.div>

      <div
        className="border-b border-t-[3px] border-double border-bronze-light border-b-sand-deep bg-sand"
        aria-hidden="true"
      >
        <div className="frieze flex justify-center gap-6 overflow-hidden py-3.5 font-brahmi text-[1.6rem] leading-[1.3] sm:gap-8 sm:text-[1.9rem]">
          {FRIEZE.map((glyph, index) => (
            <motion.span
              key={glyph}
              className="incised shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.025 }}
            >
              {glyph}
            </motion.span>
          ))}
        </div>
      </div>
    </header>
  )
}
