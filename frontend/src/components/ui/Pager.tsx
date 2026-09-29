import { Button } from "./Button";

/** "Previous · 1–20 of 45 · Next" under a paged table. Hidden when everything fits. */
export function Pager({
  offset,
  pageSize,
  total,
  onChange,
}: {
  offset: number;
  pageSize: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  if (total <= pageSize && offset === 0) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <Button
        variant="secondary"
        size="sm"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - pageSize))}
      >
        Previous
      </Button>
      <span>
        {total === 0 ? 0 : offset + 1}–{Math.min(offset + pageSize, total)} of {total}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={offset + pageSize >= total}
        onClick={() => onChange(offset + pageSize)}
      >
        Next
      </Button>
    </nav>
  );
}
