import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkeletonTableRow } from "@/components/ui/skeleton";

export interface DataColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  columns, rows, loading = false, empty,
  onRowClick,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={columns.length}><SkeletonTableRow columns={columns.length} /></TableCell></TableRow> : rows.map((row, index) => <TableRow key={row.id ?? index} selectable={Boolean(onRowClick)} onClick={() => onRowClick?.(row)}>{columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}</TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {loading ? <SkeletonTableRow columns={1} /> : rows.length ? rows.map((row, index) => <button type="button" key={row.id ?? index} onClick={() => onRowClick?.(row)} className={cn("w-full rounded-lg border border-border/60 bg-foreground/5 p-4 text-left", onRowClick && "active:scale-[0.99]")}>{columns.map((column) => <div key={column.key} className="flex items-center justify-between gap-4 border-b border-border/40 py-2 last:border-0"><span className="text-xs text-muted-foreground">{column.label}</span><span className="text-sm text-foreground">{column.render(row)}</span></div>)}</button>) : <div className="p-8 text-center text-sm text-muted-foreground">{empty ?? "No records found."}</div>}
      </div>
      {!loading && rows.length === 0 && <div className="hidden p-10 text-center text-sm text-muted-foreground md:block">{empty ?? "No records found."}</div>}
    </div>
  );
}
