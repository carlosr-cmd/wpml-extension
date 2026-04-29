import type { SimilarTicketItem } from '@/lib/types';

interface Props {
  items: SimilarTicketItem[];
}

export function SimilarTicketsSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-xs italic" style={{ color: 'var(--wpml-text-subtle)' }}>
        No similar tickets found.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.url} className="min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs leading-snug underline-offset-2 hover:underline"
            style={{ color: 'var(--wpml-accent)' }}
            title={item.title}
          >
            {item.title}
          </a>
          {item.status && (
            <span className="text-[10px]" style={{ color: 'var(--wpml-text-subtle)' }}>
              {item.status}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
