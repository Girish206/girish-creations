interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination">
      <ul className="pagination justify-content-center mt-24">
        <li className={`page-item${page <= 1 ? " disabled" : ""}`}>
          <button type="button" className="page-link" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item${p === page ? " active" : ""}`}>
            <button type="button" className="page-link" onClick={() => onPageChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item${page >= totalPages ? " disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
