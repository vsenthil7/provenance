// components/common/EmptyState.tsx
import Link from 'next/link';

export interface EmptyStateProps {
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({ title, body, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-ink/10 bg-paper p-12 text-center">
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {body && <p className="mt-2 text-ink/60">{body}</p>}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-6 inline-block rounded-md bg-ink px-4 py-2 text-paper hover:bg-ink/90"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
