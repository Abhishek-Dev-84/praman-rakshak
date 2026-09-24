import { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import { EmptyState } from './States'

export default function DataTable({ columns, data, pageSize = 8, rowKey = 'id', onRowClick, actions }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const paged = data.slice((page - 1) * pageSize, page * pageSize)

  if (!data.length) {
    return <EmptyState title="No records found" description="Try adjusting your filters or search terms." />
  }

  return (
    <div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left font-semibold text-slate-500 text-xs uppercase tracking-wide px-3 py-3 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-100 last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3.5 align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} of{' '}
            {data.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-7 w-7 rounded-lg text-xs font-semibold ${
                  page === i + 1 ? 'bg-navy-700 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span className="text-slate-400 text-xs px-1">…</span>}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RowMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      <MoreVertical size={16} />
    </button>
  )
}
