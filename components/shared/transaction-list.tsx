"use client";

import { useCallback, useMemo, useRef } from "react";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteMutation,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "../ui/button";
import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import CategoryPicker from "./category-picker";
import { DescriptionInput } from "./description-input";
import LabelPicker from "./label-picker";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useFilter } from "@/contexts/filter-context";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";
import { listTransactions } from "@/utils/supabase/queries";
import { Transaction } from "@/utils/supabase/types";

const supabase = createClient();

export default function TransactionList() {
  const { filters } = useFilter();
  const query = useQuery(listTransactions(supabase, filters));
  const data = useMemo(() => query.data ?? [], [query.dataUpdatedAt]);
  const { mutateAsync: update } = useUpdateMutation(
    supabase.from("transactions"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Transaction updated!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );
  const { mutateAsync: destroy } = useDeleteMutation(
    supabase.from("transactions"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Transaction deleted!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const onChange = useCallback(
    async (
      transaction: Transaction,
      newTransaction: Database["public"]["Tables"]["transactions"]["Update"],
    ) => {
      const updatedFields = Object.keys(
        newTransaction,
      ) as (keyof Transaction)[];
      const hasChanges = updatedFields.some(
        (field) => newTransaction[field] !== transaction[field],
      );

      if (!hasChanges) {
        return;
      }

      update({
        ...transaction,
        ...newTransaction,
      });
    },
    [update],
  );

  // Define the columns for the React Table
  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        accessorKey: "label_id",
        header: "",
        size: 20, // Set the column width to a smaller value
        cell: ({ row }) => (
          <LabelPicker
            value={row.original.label_id}
            onChange={(id: string) => {
              onChange(row.original, { label_id: id });
            }}
          />
        ),
      },
      {
        accessorKey: "category_id",
        header: "",
        size: 20, // Set the column width to a smaller value
        cell: ({ row }) => (
          <CategoryPicker
            value={row.original.category_id ?? undefined}
            onChange={(id: string) => {
              onChange(row.original, { category_id: id });
            }}
          />
        ),
      },
      {
        accessorKey: "amount_cents",
        header: "Amount",
        cell: ({ row }) => (
          <AmountInput
            id={`amount-${row.original.id}`}
            variant="ghost"
            defaultValue={row.original.amount_cents / 100}
            className={
              row.original.type === "income"
                ? "text-emerald-600"
                : "text-red-500"
            }
            onBlur={(event) => {
              onChange(row.original, {
                amount_cents: Number(event.target.value) * 100,
              });
            }}
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <DescriptionInput
            id={`desc-${row.original.id}`}
            variant="ghost"
            defaultValue={row.original.description ?? undefined}
            onBlur={(event) => {
              onChange(row.original, { description: event.target.value });
            }}
          />
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <DaterPicker
            id={`date-${row.original.id}`}
            variant="ghost"
            value={row.original.date}
            onChange={(date?: string) => {
              onChange(row.original, { date });
            }}
          />
        ),
      },
      {
        accessorKey: "id",
        header: "Delete",
        cell: ({ row }) => (
          <Button
            className="hidden group-hover:block"
            size="sm"
            id={`remove-${row.original.id}`}
            variant="ghost"
            onClick={() => {
              destroy({ id: row.original.id });
            }}
          >
            <Trash className="h-3 w-3" />
          </Button>
        ),
      },
    ],
    [onChange],
  );

  // Create the table instance using Tanstack Table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onEnd", // Can also use "onChange"
    columnResizeDirection: "rtl",
    enableColumnResizing: true,
  });

  // Virtualization Setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20, // Number of extra rows to render outside the viewport for smoother scrolling
  });

  return (
    <div
      ref={parentRef}
      // FIXME: 48 is for 12em.
      style={{ height: window.innerHeight - 48 - 40, overflow: "auto" }}
    >
      <Table className="table-fixed">
        <TableBody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            return (
              <TableRow
                key={row.id}
                className="group"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="px-2 py-1 h-10"
                    style={{ width: cell.column.getSize() ?? "auto" }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
