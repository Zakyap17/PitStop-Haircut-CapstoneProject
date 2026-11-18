import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Column<Row> = {
  /** Kunci unik kolom. */
  key: string
  header: string
  /** Isi sel untuk satu baris. */
  cell: (row: Row) => ReactNode
  /** Kelas tambahan untuk <th> dan <td> (mis. lebar atau perataan). */
  className?: string
}

type DataTableProps<Row> = {
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  /** Teks untuk pembaca layar. */
  caption: string
  /** Lebar minimum tabel sebelum menjadi scroll horizontal. */
  minWidthClass?: string
}

/** Tabel admin: header abu-abu muda, baris dipisah garis tipis, scroll horizontal di layar kecil. */
export function DataTable<Row>({ columns, rows, getRowKey, caption, minWidthClass = 'min-w-[640px]' }: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-[13px]', minWidthClass)}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-background text-xs font-medium text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn('px-6 py-3 font-medium', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-t border-border">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-6 py-4 text-foreground', column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
