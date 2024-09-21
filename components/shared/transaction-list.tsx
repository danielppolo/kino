"use client";

import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";

import { DaterPicker } from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import Category from "./category";
import CategoryPicker from "./category-picker";
import { DescriptionInput } from "./description-input";
import Subject from "./subject";
import SubjectPicker from "./subject-picker";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";
import {
  listCategories,
  listSubjects,
  listTransactions,
} from "@/utils/supabase/queries";
import { Transaction } from "@/utils/supabase/types";

export default function TransactionList() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const params = Object.fromEntries(searchParams.entries());
  const { data } = useQuery(listTransactions(supabase, params));
  const { data: categories } = useQuery(listCategories(supabase), {
    select(res) {
      const data = res.data?.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {});
      return { ...res, data };
    },
  });
  const { data: subjects } = useQuery(listSubjects(supabase), {
    select(res) {
      const data = res.data?.reduce((acc, subject) => {
        acc[subject.id] = subject;
        return acc;
      }, {});
      return { ...res, data };
    },
  });
  const { mutateAsync: update } = useUpdateMutation(
    supabase.from("transactions"),
    ["id"],
    "*",
    {
      onSuccess: () => console.log("Success!"),
    },
  );

  const onChange = async (
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

    try {
      const data = await update({
        ...transaction,
        ...newTransaction,
      });
      toast.success("Transaction updated!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              <SubjectPicker
                defaultValue={subjects[transaction.subject_id]}
                onChange={(id: string) => {
                  onChange(transaction, { subject_id: id });
                }}
              />
            </TableCell>
            <TableCell>
              <DescriptionInput
                defaultValue={transaction.description}
                onBlur={(event) => {
                  onChange(transaction, { description: event.target.value });
                }}
              />
            </TableCell>
            <TableCell>
              <AmountInput
                defaultValue={transaction.amount_cents}
                onBlur={(event) => {
                  onChange(transaction, {
                    amount_cents: Number(event.target.value),
                  });
                }}
              />
            </TableCell>
            <TableCell>
              <CategoryPicker
                defaultValue={categories[transaction.category_id]}
                onChange={(id: string) => {
                  onChange(transaction, { category_id: id });
                }}
              />
            </TableCell>
            <TableCell>
              <DaterPicker
                value={new Date(transaction.date)}
                onChange={(newDate: Date) => {
                  onChange(transaction, { date: newDate });
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
