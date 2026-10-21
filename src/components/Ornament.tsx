export default function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-14 bg-bronze-light sm:w-20" />
      <svg viewBox="0 0 12 12" className="h-2 w-2 text-bronze">
        <path d="M6 0 12 6 6 12 0 6Z" fill="currentColor" />
      </svg>
      <span className="h-px w-14 bg-bronze-light sm:w-20" />
    </div>
  )
}
