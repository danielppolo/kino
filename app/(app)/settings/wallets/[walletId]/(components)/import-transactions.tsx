"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importTransactions } from "@/utils/supabase/mutations";
import { Category, Label } from "@/utils/supabase/types";

interface CsvTransactionUploaderProps {
  categories: Category[];
  labels: Label[];
  walletId: string;
}

const TYPES = ["expense", "income"] as const;

const TransactionSchema = z.object({
  category: z.string(),
  label: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().date(),
  currency: z.string(),
  type: z.enum(TYPES),
});

const CsvTransactionUploader = ({
  categories,
  labels,
  walletId,
}: CsvTransactionUploaderProps) => {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [missingCategories, setMissingCategories] = useState<Set<string>>(
    new Set(),
  );
  const [missingLabels, setMissingLabels] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const formattedData = result.data.map((row: any) => ({
          date: row.date,
          amount: row.amount ? Number(row.amount) : undefined,
          currency: row.currency ?? "USD",
          type: row.type ?? "expense",
          description: row.description,
          category: row.category,
          label: row.label,
        }));
        console.log(formattedData);
        setCsvData(formattedData);
        validateData(formattedData);
        setOpen(true);
      },
    });
  };

  const validateData = (data: any[]) => {
    const categoryIds = categories.map((category) => category.id);
    const labelIds = labels.map((label) => label.id);
    const missingCategoriesSet = new Set<string>();
    const missingLabelsSet = new Set<string>();
    const validationErrorSet = new Set<string>();

    data.forEach((row) => {
      // Validate against Zod schema
      const validationResult = TransactionSchema.safeParse(row);

      // Check for validation errors
      if (!validationResult.success) {
        validationResult.error.issues.forEach((issue) => {
          validationErrorSet.add(`${issue.path.join(".")} ${issue.message}`);
        });
      }

      // Check if Category ID exists
      if (!categoryIds.includes(row["category_id"])) {
        missingCategoriesSet.add(row["category_id"]);
      }

      // Check if Label ID exists
      if (!labelIds.includes(row["label_id"])) {
        missingLabelsSet.add(row["label_id"]);
      }
    });

    setMissingCategories(missingCategoriesSet);
    setMissingLabels(missingLabelsSet);
    setErrors(validationErrorSet);
  };

  const handleSubmit = async () => {
    const transactions = csvData.map((row) => ({
      wallet_id: walletId,
      amount: row.amount,
      currency: row.currency,
      type: row.type,
      description: row.description,
      category: row.category,
      label: row.label,
      date: new Date(row.date).toISOString().split("T")[0], // Format YYYY-MM-DD
    }));

    await importTransactions(transactions);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Input type="file" accept=".csv" onChange={handleFileUpload} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload CSV Transactions</DialogTitle>
          <DialogDescription>
            Ensure your CSV has the correct columns: Category ID, Label ID,
            Amount, Description, and Created At.
          </DialogDescription>
        </DialogHeader>
        <Table className="w-full h-96 overflow-y-scroll">
          <TableHeader>
            <TableRow>
              {csvData.length > 0 &&
                Object.keys(csvData[0]).map((header, index) => (
                  <TableHead key={index} className="truncate p-1">
                    {header}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvData?.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {Object.values(row).map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="truncate p-1">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Validation Errors */}
        <div className="mt-4">
          {errors &&
            Array.from(errors).map((error, index) => (
              <div key={index} className="text-red-500 font-bold">
                {error}
              </div>
            ))}
          {missingCategories.size > 0 && (
            <div className="text-red-500 font-bold">
              Missing Categories: {Array.from(missingCategories).join(", ")}
            </div>
          )}
          {missingLabels.size > 0 && (
            <div className="text-red-500 font-bold">
              Missing Labels: {Array.from(missingLabels).join(", ")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit}>Submit Transactions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvTransactionUploader;
