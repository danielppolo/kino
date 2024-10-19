"use client";

import React, { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

import TransactionListPreview from "./transaction-list-preview";

import { importTransactions } from "@/actions/import-transactions";
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
import { useCategories, useLabels } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

interface CsvTransactionUploaderProps {
  walletId: string;
}

interface Row {
  date: string;
  type?: string;
  amount?: number;
  description?: string;
  category?: string;
  label?: string;
  tags?: string;
}

const CsvTransactionUploader = ({ walletId }: CsvTransactionUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, categoriesMap] = useCategories("name");
  const [, labelsMap] = useLabels("name");
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<Row[]>([]);
  const [options, setOptions] = useState({
    missingCategory: "new",
    missingLabel: "new",
  } as const);

  const csvDisplayData = useMemo(() => {
    const isLabel = (id?: string) => id && labelsMap.has(id);
    const isCategory = (id?: string) => id && categoriesMap.has(id);
    return csvData.map((row: Row) => ({
      date: row.date,
      type: row.type,
      amount: row.amount
        ? formatCents(Math.round(Number(row.amount) * 100))
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
      tags: row.tags?.split(",").map((tag) => tag.trim()),
    }));
  }, [
    csvData,
    labelsMap,
    categoriesMap,
    options.missingCategory,
    options.missingLabel,
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rawData = result.data.map((row) => ({
          date: row.date,
          type: row.type,
          amount: row.amount ? Number(row.amount) : undefined,
          description: row.description,
          category: row.category,
          label: row.label,
          tags: row.tags,
        }));
        setCsvData(rawData);
        setOpen(true);
      },
    });
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

    const { error } = await importTransactions({
      walletId,
      transactions,
      options,
    });

    if (error) {
      console.error(error);
      return toast.error("Failed to import transactions");
    }
    toast.success("Transactions imported successfully");
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    setCsvData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Input
        ref={fileInputRef}
        className="h-10 w-48"
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload CSV Transactions</DialogTitle>
          <DialogDescription>
            Ensure your CSV has the correct columns: Category ID, Label ID,
            Amount, Description, and Created At.
          </DialogDescription>
        </DialogHeader>
        <TransactionListPreview transactions={csvDisplayData} />
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

{
  /* <div className="mt-4">
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
</div> */
}
