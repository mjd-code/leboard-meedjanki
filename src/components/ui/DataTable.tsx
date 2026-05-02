import React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronDown, Trash2 } from "lucide-react";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterPlaceholder?: string;
  onDeleteSelected?: (ids: string[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Filter...",
  onDeleteSelected,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map((row) => (row.original as any).id).filter(Boolean);
    if (onDeleteSelected) onDeleteSelected(ids);
    table.setRowSelection({});
  };

  const getPageNumbers = () => {
    const currentPage = table.getState().pagination.pageIndex;
    const pageCount = table.getPageCount();
    const maxVisiblePages = 5;

    if (pageCount <= maxVisiblePages) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(pageCount - 1, currentPage + 2);

    if (currentPage <= 2) {
      endPage = maxVisiblePages - 1;
    } else if (currentPage >= pageCount - 3) {
      startPage = pageCount - maxVisiblePages;
    }

    const pages: (number | string)[] = [];
    if (startPage > 0) {
      pages.push(0);
      if (startPage > 1) {
        pages.push("...");
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < pageCount - 1) {
      if (endPage < pageCount - 2) {
        pages.push("...");
      }
      pages.push(pageCount - 1);
    }

    return pages;
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-4">
        {selectedCount > 0 && onDeleteSelected && (
          <div className="flex justify-end mb-2">
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Bulk Delete ({selectedCount})
            </Button>
          </div>
        )}
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <Card key={row.id} className="rounded-xl shadow-soft border border-border">
              <CardContent className="p-4 flex flex-col gap-2 relative">
                {row.getVisibleCells().map((cell) => {
                  const headerTitle =
                    typeof cell.column.columnDef.header === "string"
                      ? cell.column.columnDef.header
                      : cell.column.id;

                  return (
                    <div
                      key={cell.id}
                      className="flex justify-between items-center text-sm border-b border-border/40 py-3 last:border-0 last:pb-0 font-medium"
                    >
                      <span className="text-muted-foreground pr-4">
                        {headerTitle}
                      </span>
                      <span className="text-foreground text-right break-words">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-soft border-border p-8 text-center text-muted-foreground font-medium">
            No results.
          </Card>
        )}
        
        {/* Mobile Pagination */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Rows per page
            </p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] bg-card border-border shadow-sm">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-xl border-border bg-card shadow-sm h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {table.getPageCount() > 0 && getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-\${index}`} className="px-1 text-muted-foreground">
                    ...
                  </span>
                );
              }
              const pageIndex = page as number;
              return (
                <Button
                  key={pageIndex}
                  variant={table.getState().pagination.pageIndex === pageIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageIndex)}
                  className="rounded-xl h-9 w-9 p-0 font-medium border-border"
                >
                  {pageIndex + 1}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-xl border-border bg-card shadow-sm h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 shadow-sm border border-border p-4 rounded-xl bg-card">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {filterColumn && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterColumn)?.setFilterValue(event.target.value)
              }
              className="max-w-xs rounded-xl bg-transparent border-border shadow-sm font-normal"
            />
          )}
          {selectedCount > 0 && onDeleteSelected && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2 shadow-sm rounded-xl h-9">
              <Trash2 className="w-4 h-4" /> Bulk Delete ({selectedCount})
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto rounded-xl border-border bg-transparent shadow-sm font-medium gap-2 text-foreground h-9">
              Columns <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-md border-border">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize font-medium cursor-pointer"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden shadow-inner">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/50 bg-secondary/30">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="font-semibold text-foreground whitespace-nowrap px-4 py-3 h-10">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-secondary/20 transition-colors border-border/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center font-medium text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground font-medium">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:block">
              Rows per page
            </p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] bg-transparent border-border shadow-sm">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl border-border bg-transparent shadow-sm font-medium h-9 px-3"
          >
            <ChevronLeft className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="hidden sm:flex items-center space-x-1">
            {table.getPageCount() > 0 && getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-\${index}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }
              const pageIndex = page as number;
              return (
                <Button
                  key={pageIndex}
                  variant={table.getState().pagination.pageIndex === pageIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageIndex)}
                  className="rounded-xl h-9 w-9 p-0 font-medium border-border"
                >
                  {pageIndex + 1}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-xl border-border bg-transparent shadow-sm font-medium h-9 px-3"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 sm:hidden" />
          </Button>
        </div>
      </div>
    </div>
  );
}
