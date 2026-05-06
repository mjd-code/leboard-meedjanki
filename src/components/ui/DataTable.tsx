import React, { useState, useEffect } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PopoverSelect } from "@/components/ui/PopoverSelect";
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon
} from "lucide-react";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterPlaceholder?: string;
  onDeleteSelected?: (ids: string[]) => void;
  globalFilter?: string;
  setGlobalFilter?: (value: string) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Cari data...",
  onDeleteSelected,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  useEffect(() => {
    setViewMode(isDesktop ? "table" : "card");
  }, [isDesktop]);

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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

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

  const renderCardView = () => (
    <div className="flex flex-col gap-4">
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
                    className="flex justify-between items-center text-sm border-b border-border/40 py-3 last:border-0 last:pb-0 font-medium overflow-hidden"
                  >
                    <span className="text-muted-foreground pr-4 shrink-0">
                      {headerTitle}
                    </span>
                    <span className="text-foreground text-right break-words min-w-0 line-clamp-2">
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
          Tidak ada data.
        </Card>
      )}
    </div>
  );

  const renderTableView = () => (
    <div className="rounded-xl border border-border bg-background overflow-hidden overflow-x-auto shadow-inner w-full">
      <Table className="min-w-full">
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
                  <TableCell key={cell.id} className="px-4 py-3 align-middle max-w-[200px] sm:max-w-none truncate sm:whitespace-normal">
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
                Tidak ada data.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="w-full space-y-4 shadow-sm border border-border p-4 rounded-xl bg-card">
      {/* Responsive Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between w-full">
        {/* Search */}
        <div className="relative w-full md:max-w-md shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={filterPlaceholder}
            value={filterColumn ? (table.getColumn(filterColumn)?.getFilterValue() as string ?? "") : globalFilter}
            onChange={(event) => {
              if (filterColumn) {
                table.getColumn(filterColumn)?.setFilterValue(event.target.value);
              } else {
                setGlobalFilter(event.target.value);
              }
            }}
            className="w-full pl-9 rounded-xl bg-background border-border shadow-soft h-10"
          />
        </div>

        {/* Action Buttons and View Toggle */}
        <div className="flex flex-row items-center gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-hide md:shrink-0 w-full md:w-auto">
          {selectedCount > 0 && onDeleteSelected && (
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2 shadow-sm rounded-xl h-10 whitespace-nowrap shrink-0">
              <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Hapus</span> ({selectedCount})
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-border bg-background shadow-soft h-10 shrink-0">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Kolom</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-md border-border shrink-0">
              <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
                      {column.id === "select" || column.id === "actions" ? column.id : typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-border bg-background shadow-soft h-10 shrink-0">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Pilih Urutan</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-md border-border">
              <DropdownMenuLabel>Urutkan Berdasarkan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanSort())
                .map((column) => {
                  const isSorted = column.getIsSorted();
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize font-medium cursor-pointer"
                      checked={!!isSorted}
                      onCheckedChange={() => {
                        if (isSorted === "desc") {
                          column.clearSorting();
                        } else {
                          column.toggleSorting(isSorted === "asc");
                        }
                      }}
                    >
                      {column.id === "select" || column.id === "actions" ? column.id : typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id} 
                      {isSorted === "asc" ? " (A-Z)" : isSorted === "desc" ? " (Z-A)" : ""}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex bg-muted/50 p-1 rounded-xl shrink-0 border border-border ml-auto md:ml-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={`h-8 w-8 p-0 rounded-lg transition-all ${
                viewMode === "table" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("card")}
              className={`h-8 w-8 p-0 rounded-lg transition-all ${
                viewMode === "card" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {viewMode === "card" ? renderCardView() : renderTableView()}
      </div>

      {/* Pagination Footer */}
      <div className={`flex items-center justify-between gap-4 pt-4 border-t border-border/50 ${viewMode === 'card' ? 'flex-col sm:flex-row' : ''}`}>
        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-sm text-muted-foreground font-medium hidden sm:block">
            {table.getFilteredSelectedRowModel().rows.length} dari{" "}
            {table.getFilteredRowModel().rows.length} baris terpilih.
          </div>
          
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Baris
            </p>
            <PopoverSelect
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
              options={[10, 20, 50, 100].map(pageSize => ({ value: `${pageSize}`, label: `${pageSize}` }))}
              placeholder={`${table.getState().pagination.pageSize}`}
              className="h-8 w-[70px] bg-transparent border-border shadow-sm text-xs"
            />
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl border-border bg-transparent shadow-sm font-medium h-8 px-2"
          >
            <ChevronLeft className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          <div className="flex items-center space-x-1">
            {table.getPageCount() > 0 && getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
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
                  className={`rounded-xl h-8 w-8 p-0 font-medium ${
                    table.getState().pagination.pageIndex === pageIndex ? "" : "border-border"
                  }`}
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
            className="rounded-xl border-border bg-transparent shadow-sm font-medium h-8 px-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 sm:hidden" />
          </Button>
        </div>
      </div>
    </div>
  );
}
