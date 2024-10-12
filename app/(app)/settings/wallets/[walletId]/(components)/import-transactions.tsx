"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { z } from "zod";

import TransactionListPreview from "./transaction-list-preview";

import { importTransactions, Options } from "@/actions/import-transactions";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCategories, useLabels } from "@/contexts/settings-context";
import { Category, Label as LabelType } from "@/utils/supabase/types";

interface CsvTransactionUploaderProps {
  categories: Category[];
  labels: LabelType[];
  walletId: string;
}

const TYPES = ["expense", "income"] as const;

const TransactionSchema = z.object({
  category: z.string(),
  label: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().date(),
  type: z.enum(TYPES),
});

const CsvTransactionUploader = ({ walletId }: CsvTransactionUploaderProps) => {
  const [categories] = useCategories();
  const [labels] = useLabels();
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [options, setOptions] = useState<Options>({
    missingCategory: "new",
    missingLabel: "new",
  });
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
          type: row.type,
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

      // // Check for validation errors
      // if (!validationResult.success) {
      //   validationResult.error.issues.forEach((issue) => {
      //     validationErrorSet.add(`${issue.path.join(".")} ${issue.message}`);
      //   });
      // }

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
      amount: row.amount,
      type: row.type,
      description: row.description,
      category: row.category,
      label: row.label,
      date: new Date(row.date).toISOString().split("T")[0], // Format YYYY-MM-DD
    }));

    const { error } = await importTransactions(walletId, transactions, options);

    if (error) {
      return toast.error("Failed to import transactions");
    }
    toast.success("Transactions imported successfully");
    setOpen(false);
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
        <TransactionListPreview transactions={csvData} />

        {/* Validation Errors */}
        <div className="mt-4">
          {/* {errors &&
            Array.from(errors).map((error, index) => (
              <div key={index} className="text-red-500 font-bold">
                {error}
              </div>
            ))} */}
          {missingCategories.size > 0 && (
            <div>
              <p>Handle missing categories</p>
              <RadioGroup
                defaultValue={options.missingCategory}
                onValueChange={(n) =>
                  setOptions((v) => ({
                    ...v,
                    missingCategory: n as "new" | "other",
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-category" />
                  <Label htmlFor="new-category">Create new</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other-category" />
                  <Label htmlFor="other-category">Use `Other`</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          {/* {missingLabels.size > 0 && (
            <div className="text-red-500 font-bold">
              Missing Labels: {Array.from(missingLabels).join(", ")}
            </div>
          )} */}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit}>Submit Transactions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvTransactionUploader;
