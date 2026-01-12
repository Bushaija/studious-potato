"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { User } from "@/types/user";
import { useDataTable } from "@/hooks/use-data-table";
import type { DataTableRowAction } from "@/types/data-table";
import { useGetUsers } from "@/hooks/queries/users/use-get-users";
import { useUpdateUser } from "@/hooks/mutations/users/use-update-user";
import { BanUserDialog } from "./ban-user-dialog";
import { UnbanUserDialog } from "./unban-user-dialog";
import { CreateUserSheet } from "./create-user-sheet";
import { UpdateUserSheet } from "./update-user-sheet";
import { UsersTableActionBar } from "./users-table-action-bar";
import { getUsersTableColumns } from "./users-table-columns";
import { UsersTableToolbarActions } from "./users-table-toolbar-actions";
import type { UserRole } from "@/types/user";

interface UsersTableProps {
  initialData?: {
    users: User[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function UsersTable({ initialData }: UsersTableProps) {
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<User> | null>(null);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = React.useState<any[]>([]);
  
  const updateUserMutation = useUpdateUser();

  const handleRoleChange = React.useCallback(async (userId: string, newRole: UserRole) => {
    await updateUserMutation.mutateAsync({
      userId,
      role: newRole,
    });
  }, [updateUserMutation]);

  const columns = React.useMemo(
    () => getUsersTableColumns({ setRowAction, onRoleChange: handleRoleChange }),
    [handleRoleChange]
  );

  // Convert column filters to API parameters
  const filterParams = React.useMemo(() => {
    const filters: Record<string, any> = {};
    columnFilters.forEach((filter: any) => {
      if (filter.id === 'role' && Array.isArray(filter.value)) {
        filters.role = filter.value[0]; // Take first selected role
      } else if (filter.id === 'status' && Array.isArray(filter.value)) {
        const status = filter.value[0];
        if (status === 'banned') {
          filters.banned = 'true';
        } else if (status === 'active') {
          filters.isActive = 'true';
        } else if (status === 'inactive') {
          filters.isActive = 'false';
        }
      } else if (filter.id === 'name' && filter.value) {
        filters.search = filter.value;
      }
    });
    return filters;
  }, [columnFilters]);

  // Use the hook to get users data with pagination and filters
  const { data, isLoading, error } = useGetUsers({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...filterParams,
  });

  const users = data?.users || initialData?.users || [];
  const pageCount = data?.pagination?.totalPages || initialData?.pagination?.totalPages || 1;

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data: users,
    columns,
    pageCount: pageCount,
    enableAdvancedFilter: true,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
      pagination: pagination,
    },
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  // Update pagination state when table pagination changes
  React.useEffect(() => {
    const tablePagination = table.getState().pagination;
    if (tablePagination.pageIndex !== pagination.pageIndex || tablePagination.pageSize !== pagination.pageSize) {
      setPagination(tablePagination);
    }
  }, [table, pagination]);

  // Update column filters state when table filters change
  React.useEffect(() => {
    const tableFilters = table.getState().columnFilters;
    setColumnFilters(tableFilters);
  }, [table]);

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    console.error("Error loading users:", error);
    return <div>Error loading users: {error.message}</div>;
  }

  return (
    <>
      <DataTable
        table={table}
        actionBar={<UsersTableActionBar table={table} />}
      >
        <DataTableAdvancedToolbar table={table}>
          {/* <DataTableSortList table={table} align="start" /> */}
          {/* <DataTableFilterList
            table={table}
            shallow={shallow}
            debounceMs={debounceMs}
            throttleMs={throttleMs}
            align="start"
          /> */}
          <div className="ml-auto">
            <UsersTableToolbarActions table={table} />
          </div>
        </DataTableAdvancedToolbar>
      </DataTable>
      
      <UpdateUserSheet
        open={rowAction?.variant === "update"}
        onOpenChange={() => setRowAction(null)}
        user={rowAction?.row.original ?? null}
      />
      
      <BanUserDialog
        open={rowAction?.variant === "ban"}
        onOpenChange={() => setRowAction(null)}
        user={rowAction?.row.original ?? null}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
      
      <UnbanUserDialog
        open={rowAction?.variant === "unban"}
        onOpenChange={() => setRowAction(null)}
        user={rowAction?.row.original ?? null}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
    </>
  );
}
