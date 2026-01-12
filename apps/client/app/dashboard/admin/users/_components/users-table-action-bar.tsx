"use client";

import type { Table } from "@tanstack/react-table";
import { Download, UserCheck, UserX, Shield } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { User, UserRole } from "@/types/user";
import { exportTableToCSV } from "@/lib/export";
import useBanUser from "@/hooks/mutations/users/use-ban-user";
import useUnbanUser from "@/hooks/mutations/users/use-unban-user";

const actions = [
  "update-role",
  "ban-users",
  "unban-users",
  "export",
] as const;

type Action = (typeof actions)[number];

const userRoles: UserRole[] = ["admin", "accountant", "program_manager"];

interface UsersTableActionBarProps {
  table: Table<User>;
}

export function UsersTableActionBar({ table }: UsersTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);

  const banUserMutation = useBanUser();
  const unbanUserMutation = useUnbanUser();

  const getIsActionPending = React.useCallback(
    (action: Action) => isPending && currentAction === action,
    [isPending, currentAction],
  );

  const onRoleUpdate = React.useCallback(
    (role: UserRole) => {
      setCurrentAction("update-role");
      startTransition(async () => {
        // TODO: Implement bulk role update
        toast.promise(
          Promise.resolve(), // Replace with actual API call
          {
            loading: "Updating roles...",
            success: "Roles updated",
            error: "Failed to update roles",
          },
        );
      });
    },
    [rows],
  );

  const onBanUsers = React.useCallback(() => {
    setCurrentAction("ban-users");
    startTransition(async () => {
      const banPromises = rows.map((row) =>
        banUserMutation.mutateAsync({
          userId: row.original.id,
          banReason: "Bulk ban operation",
          banExpiresIn: 30, // 30 days
        })
      );

      try {
        await Promise.all(banPromises);
        toast.success("Users banned successfully");
        table.toggleAllRowsSelected(false);
      } catch (error) {
        toast.error("Failed to ban some users");
      }
    });
  }, [rows, banUserMutation, table]);

  const onUnbanUsers = React.useCallback(() => {
    setCurrentAction("unban-users");
    startTransition(async () => {
      const unbanPromises = rows.map((row) =>
        unbanUserMutation.mutateAsync({
          userId: row.original.id,
          reason: "Bulk unban operation",
        })
      );

      try {
        await Promise.all(unbanPromises);
        toast.success("Users unbanned successfully");
        table.toggleAllRowsSelected(false);
      } catch (error) {
        toast.error("Failed to unban some users");
      }
    });
  }, [rows, unbanUserMutation, table]);

  const onUsersExport = React.useCallback(() => {
    setCurrentAction("export");
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ["select", "actions"],
        onlySelected: true,
        filename: "users",
      });
    });
  }, [table]);

  const selectedBannedUsers = rows.filter((row) => row.original.banned);
  const selectedActiveUsers = rows.filter((row) => !row.original.banned);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <Select onValueChange={onRoleUpdate}>
          <SelectTrigger className="h-7 w-7 p-0">
            <Shield className="h-3.5 w-3.5" />
          </SelectTrigger>
          <SelectContent align="center">
            <SelectGroup>
              {userRoles.map((role) => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {selectedActiveUsers.length > 0 && (
          <DataTableActionBarAction
            size="icon"
            tooltip="Ban selected users"
            isPending={getIsActionPending("ban-users")}
            onClick={onBanUsers}
          >
            <UserX />
          </DataTableActionBarAction>
        )}

        {selectedBannedUsers.length > 0 && (
          <DataTableActionBarAction
            size="icon"
            tooltip="Unban selected users"
            isPending={getIsActionPending("unban-users")}
            onClick={onUnbanUsers}
          >
            <UserCheck />
          </DataTableActionBarAction>
        )}

        <DataTableActionBarAction
          size="icon"
          tooltip="Export users"
          isPending={getIsActionPending("export")}
          onClick={onUsersExport}
        >
          <Download />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
