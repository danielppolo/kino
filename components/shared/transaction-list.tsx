import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Transaction } from "@/utils/supabase/types";

interface TransactionListProps {
  transactions?: Transaction[];
}

export default async function TransactionList({
  transactions,
}: TransactionListProps) {
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
        {transactions?.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {/* {transaction.subject_id && (
                <Icon
                  name={subjectsDictionary[]}
                  color="red"
                  size={20}
                />
              )} */}
              {transaction.subject_id}
            </TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell>
              {transaction.amount_cents.toFixed(2)} {transaction.currency}
            </TableCell>
            <TableCell>{transaction.category_id}</TableCell>
            <TableCell>{format(new Date(transaction.date), "PPP")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
