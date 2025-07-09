"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCategories, useLabels } from "@/contexts/settings-context";

interface SerializedRow {
  date: string;
  type?: string;
  amount?: string;
  description?: string;
  category?: string;
  label?: string;
  tags?: string;
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

const CsvTransactionUploader = ({
  fileInputRef,
}: {
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const { walletId } = useParams();
  const [, categoriesMap] = useCategories("name");
  const [, labelsMap] = useLabels("name");
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<Row[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      amount: row.amount ? Math.round(Number(row.amount) * 100) : undefined,
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

    Papa.parse<SerializedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rawData = result.data.map((row) => ({
          date: row.date,
          type: row.type,
          amount: row.amount ? Number(row.amount.replace(/,/g, "")) : undefined,
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
    setIsSubmitting(true);
    const transactions = csvData.map((row) => ({
      amount: row.amount
        ? row.type === "expense"
          ? -Math.abs(row.amount)
          : Math.abs(row.amount)
        : undefined,
      type: row.type,
      description: row.description,
      category: row.category,
      label: row.label,
      date: new Date(row.date.split("/").reverse().join("-"))
        .toISOString()
        .split("T")[0], // Parse DD/MM/YYYY to YYYY-MM-DD
      tags: row.tags
        ?.split(",")
        .filter((tag) => tag.trim() !== "")
        .map((tag) => tag.trim()),
    }));

    const { error } = await importTransactions({
      walletId,
      transactions,
      options,
    });

    if (error) {
      console.error(error);
      toast.error("Failed to import transactions");
      setIsSubmitting(false);
      return;
    }
    toast.success("Transactions imported successfully");
    setOpen(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setOpen(false);
    setCsvData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!walletId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogTrigger>
          <Input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </DialogTrigger>
        <DialogContent className="max-h-1/2 max-w-2xl">
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
              <SubmitButton isLoading={isSubmitting}>
                Submit Transactions
              </SubmitButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CsvTransactionUploader;
