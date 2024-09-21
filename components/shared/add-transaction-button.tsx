"use client";

import React from "react";
import { Plus } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import TransactionForm from "./transaction-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";
import { listCategories, listSubjects } from "@/utils/supabase/queries";

const AddTransactionButton = () => {
  const supabase = createClient();
  const { data: categories } = useQuery(listCategories(supabase));
  const { data: subjects } = useQuery(listSubjects(supabase));

  const handleAddTransaction = async (
    newTransaction: Database["public"]["Tables"]["transactions"]["Insert"],
  ) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert([newTransaction]);

    if (error) {
      console.error("Error adding transaction:", error);
    } else {
      //   setIsDialogOpen(false);
      // fetchTransactions();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <TransactionForm
          categories={categories}
          subjects={subjects}
          onSubmit={handleAddTransaction}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionButton;
