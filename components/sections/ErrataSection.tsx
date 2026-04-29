import type { ErrataItem } from '@/lib/types';

interface Props {
  items: ErrataItem[];
}

export function ErrataSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-xs italic" style={{ color: 'var(--wpml-text-subtle)' }}>
        No related errata found.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs leading-snug underline-offset-2 hover:underline"
            style={{ color: 'var(--wpml-accent)' }}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
