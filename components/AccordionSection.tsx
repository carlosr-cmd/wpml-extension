import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  rightSlot?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionSection({
  title,
  rightSlot,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--wpml-border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
      >
        <div className="flex items-center gap-2">
          <Chevron open={open} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--wpml-text-muted)' }}
          >
            {title}
          </span>
        </div>
        {rightSlot && (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            {rightSlot}
          </div>
        )}
      </button>
      {open && <div className="px-4 pb-3.5 pt-0.5">{children}</div>}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style={{
        color: 'var(--wpml-text-subtle)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 120ms ease',
      }}
      fill="none"
    >
      <path
        d="M3 1.5L7 5L3 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
