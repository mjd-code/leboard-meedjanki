// Generic, reusable data table extracted from the existing Students/Insight CMS table.
// This is a thin re-export of the canonical <DataTable /> implementation so that the
// styling, pagination, sorting, search and column-visibility behaviour stays identical
// across every admin surface (DRY: one source of truth in src/components/ui/DataTable.tsx).
import { DataTable, type DataTableProps } from "@/components/ui/DataTable";

export type UniversalDataTableProps<TData, TValue> = DataTableProps<TData, TValue>;

export function UniversalDataTable<TData, TValue>(
  props: UniversalDataTableProps<TData, TValue>,
) {
  return <DataTable {...props} />;
}

export default UniversalDataTable;
