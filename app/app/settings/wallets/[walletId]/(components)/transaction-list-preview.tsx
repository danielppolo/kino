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

interface Transaction {
  [key: string]: string | number | boolean | string[] | null | undefined;
}

interface TransactionListPreviewProps {
  transactions: Transaction[];
}

const TransactionListPreview: React.FC<TransactionListPreviewProps> = ({
  transactions,
}) => {
  return (
    <div className="h-[200px] w-full overflow-auto">
      <Table className="h-full w-full">
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
        <TableBody className="overflow-y-scroll">
          {transactions.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="h-8">
              {Object.values(row).map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="truncate p-1 px-2">
                  {`${cell || "-"}`}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionListPreview;
