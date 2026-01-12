"use client";

import type { Table } from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";
import { exportTableToCSV } from "@/lib/export";

import { CreateUserSheet } from "./create-user-sheet";

interface UsersTableToolbarActionsProps {
  table: Table<User>;
}

export function UsersTableToolbarActions({
  table,
}: UsersTableToolbarActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <CreateUserSheet />
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          exportTableToCSV(table, {
            filename: "users",
            excludeColumns: ["select", "actions"],
          })
        }
      >
        <Download className="mr-2 size-4" />
        Export
      </Button>
    </div>
  );
}
