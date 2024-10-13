"use client";

import React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionListPreviewProps {
  transactions: any[];
}

const TransactionListPreview: React.FC<TransactionListPreviewProps> = ({
  transactions,
}) => {
  const displayedTransactions = transactions.slice(0, 5);
  const remainingTransactionsCount = transactions.length - 5;

  return (
    <div className="w-full overflow-auto">
      <Table className="w-full overflow-y-scroll">
        <TableHeader>
          <TableRow>
            {transactions.length > 0 &&
              Object.keys(transactions[0]).map((header, index) => (
                <TableHead key={index} className="truncate p-1 px-2">
                  {header.charAt(0).toUpperCase() + header.slice(1)}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedTransactions.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="h-8">
              {Object.values(row).map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="truncate p-1 px-2">
                  {`${cell || "-"}`}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {remainingTransactionsCount > 0 && (
            <TableRow className="h-8">
              <TableCell
                colSpan={Object.keys(transactions[0]).length}
                className="p-1"
              >
                + {remainingTransactionsCount} more transaction
                {remainingTransactionsCount !== 1 ? "s" : ""}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionListPreview;
