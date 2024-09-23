"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import CategoryPicker from "./category-picker";
import { DescriptionInput } from "./description-input";
import SubjectPicker from "./subject-picker";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";
import { listTransactions } from "@/utils/supabase/queries";
import { Transaction } from "@/utils/supabase/types";

export default function TransactionList() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const params = Object.fromEntries(searchParams.entries());
  const { data } = useQuery(listTransactions(supabase, params));

  const { mutateAsync: update } = useUpdateMutation(
    supabase.from("transactions"),
    ["id"],
    "*",
    {
      onSuccess: (data) => {
        toast.success("Transaction updated!");
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
      const updatedFields = Object.keys(newTransaction);
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
        accessorKey: "category_id",
        header: "",
        size: 20, // Set the column width to a smaller value
        cell: ({ row }) => (
          <CategoryPicker
            value={row.original.category_id}
            onChange={(id: string) => {
              onChange(row.original, { category_id: id });
            }}
          />
        ),
      },
      {
        accessorKey: "subject_id",
        header: "",
        size: 20, // Set the column width to a smaller value
        cell: ({ row }) => (
          <SubjectPicker
            value={row.original.subject_id ?? undefined}
            onChange={(id: string) => {
              onChange(row.original, { subject_id: id });
            }}
          />
        ),
      },
      {
        accessorKey: "amount_cents",
        header: "Amount",
        size: 50,
        cell: ({ row }) => (
          <AmountInput
            variant="ghost"
            defaultValue={row.original.amount_cents / 100}
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
            variant="ghost"
            value={row.original.date}
            onChange={(date: string) => {
              onChange(row.original, { date });
            }}
          />
        ),
      },
    ],
    [onChange],
  );

  // Create the table instance using Tanstack Table
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onEnd", // Can also use "onChange"
    columnResizeDirection: "rtl",
    enableColumnResizing: true,
  });

  return (
    <Table className="table-fixed">
      {/* <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                {...{
                  colSpan: header.colSpan,
                  style: {
                    width: header.getSize(),
                    position: "relative",
                  },
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                <div
                  {...{
                    onDoubleClick: () => header.column.resetSize(),
                    onMouseDown: header.getResizeHandler(),
                    onTouchStart: header.getResizeHandler(),
                    className: `resizer ${
                      table.options.columnResizeDirection
                    } ${header.column.getIsResizing() ? "isResizing" : ""}`,
                    style: {
                      transform: header.column.getIsResizing()
                        ? `translateX(${
                            (table.options.columnResizeDirection === "rtl"
                              ? -1
                              : 1) *
                            (table.getState().columnSizingInfo.deltaOffset ?? 0)
                          }px)`
                        : "",
                    },
                  }}
                />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader> */}
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className="p-2"
                style={{ width: cell.column.getSize() }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
