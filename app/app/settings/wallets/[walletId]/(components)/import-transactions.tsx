"use client";

import React, { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { z } from "zod";

import TransactionListPreview from "./transaction-list-preview";

import { importTransactions, Options } from "@/actions/import-transactions";
import { SubmitButton } from "@/components/submit-button";
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
import {
  useCategories,
  useLabels,
  useWallets,
} from "@/contexts/settings-context";

interface CsvTransactionUploaderProps {
  walletId: string;
}

const TransactionSchema = z.object({
  category: z.string(),
  label: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  type: z.string().optional(),
  date: z.string().date(),
});

const CsvTransactionUploader = ({ walletId }: CsvTransactionUploaderProps) => {
  const [, categoriesMap] = useCategories("name");
  const [, labelsMap] = useLabels("name");
  const [, walletsMap] = useWallets();
  const wallet = walletsMap.get(walletId);
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

  const csvDisplayData = useMemo(() => {
    const isLabel = (id: string) => labelsMap.has(id);
    const isCategory = (id: string) => categoriesMap.has(id);
    return csvData.map((row) => ({
      date: row.date,
      type: row.type,
      amount: row.amount
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: wallet?.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(row.amount))
        : undefined,
      description: row.description,
      category:
        isCategory(row.category) || options.missingCategory === "new"
          ? row.category
          : "Other",
      label:
        isLabel(row.label) || options.missingLabel === "new"
          ? row.label
          : "Other",
    }));
  }, [
    csvData,
    labelsMap,
    categoriesMap,
    wallet?.currency,
    options.missingCategory,
    options.missingLabel,
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rawData = result.data.map((row: any) => ({
          date: row.date,
          type: row.type,
          amount: row.amount ? Number(row.amount) : undefined,
          description: row.description,
          category: row.category,
          label: row.label,
        }));
        setCsvData(rawData);
        validateData(rawData);
        setOpen(true);
      },
    });
  };

  const validateData = useCallback(
    (data: any[]) => {
      const missingCategoriesSet = new Set<string>();
      const missingLabelsSet = new Set<string>();
      const validationErrorSet = new Set<string>();

      const results = data.map((row) => {
        // Validate against Zod schema
        const validationResult = TransactionSchema.safeParse(row);

        // Check for validation errors
        if (!validationResult.success) {
          validationResult.error.issues.forEach((issue) => {
            validationErrorSet.add(`${issue.path.join(".")} ${issue.message}`);
          });
        }

        // Check if Category ID exists
        if (!categoriesMap.has(row["category"])) {
          missingCategoriesSet.add(row["category"]);
        }

        // Check if Label ID exists
        if (!labelsMap.has(row["label"])) {
          missingLabelsSet.add(row["label"]);
        }

        return validationResult.success;
      });

      setMissingCategories(missingCategoriesSet);
      setMissingLabels(missingLabelsSet);
      setErrors(validationErrorSet);

      return results;
    },
    [categoriesMap, labelsMap],
  );

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
      console.error(error);
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
        <TransactionListPreview transactions={csvDisplayData} />

        <div className="mt-4">
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

          {missingLabels.size > 0 && (
            <div>
              <p>Handle missing labels</p>
              <RadioGroup
                defaultValue={options.missingLabel}
                onValueChange={(n) =>
                  setOptions((v) => ({
                    ...v,
                    missingLabel: n as "new" | "other",
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-label" />
                  <Label htmlFor="new-label">Create new</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other-label" />
                  <Label htmlFor="other-label">Use `Other`</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <form action={handleSubmit}>
            <SubmitButton>Submit Transactions</SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvTransactionUploader;
