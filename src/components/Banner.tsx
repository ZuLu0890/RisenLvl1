import type { ReactNode } from 'react'

/**
 * Generic feedback banner used across the app for connection errors,
 * transaction results, and informational notices.
 */

export type BannerVariant = 'success' | 'error' | 'info' | 'warning'

interface BannerProps {
  variant: BannerVariant
  /** Short heading, e.g. "Payment sent" or "Connection failed". */
  title: string
  children?: ReactNode
  /** Renders a dismiss ("×") button that calls this. */
  onDismiss?: () => void
  className?: string
}

const VARIANT_STYLES: Record<
  BannerVariant,
  { box: string; icon: ReactNode }
> = {
  success: {
    box: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    icon: (
      <svg
        className="mt-0.5 size-5 shrink-0 text-emerald-300"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    box: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    icon: (
      <svg
        className="mt-0.5 size-5 shrink-0 text-rose-300"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    box: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    icon: (
      <svg
        className="mt-0.5 size-5 shrink-0 text-sky-300"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    box: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    icon: (
      <svg
        className="mt-0.5 size-5 shrink-0 text-amber-300"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
}

export default function Banner({
  variant,
  title,
  children,
  onDismiss,
  className = '',
}: BannerProps) {
  const { box, icon } = VARIANT_STYLES[variant]

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${box} ${className}`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-inherit/80">{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
