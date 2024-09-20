"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

import TransactionForm from "@/components/shared/transaction-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
// import { BarChart, LineChart } from "@/components/ui/charts"

const ITEMS_PER_PAGE = 10;

export default function TransactionDashboard() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState([]);
  const [intentions, setIntentions] = useState([]);
  const [categoriesDictionary, setCategoriesDictionary] = useState({});
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [stats, setStats] = useState({ total: 0, in: 0, out: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, dateRange]);

  useEffect(() => {
    fetchIntentions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .range(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE - 1,
      )
      .order("date", { ascending: false });

    if (dateRange.start && dateRange.end) {
      query = query.gte("date", dateRange.start).lte("date", dateRange.end);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data);
      setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      calculateStats(data);
    }
  };

  const fetchIntentions = async () => {
    let query = supabase.from("intentions").select("*");

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setIntentions(data);
    }
  };

  const fetchCategories = async () => {
    let query = supabase.from("categories").select("*");

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setCategories(data);
      setCategoriesDictionary(
        data.reduce((acc, cat) => {
          acc[cat.id] = cat.icon;
          return acc;
        }, {}),
      );
    }
  };

  const calculateStats = (data) => {
    const stats = data.reduce(
      (acc, transaction) => {
        acc.total += transaction.amount_cents;
        if (transaction.amount_cents > 0) {
          acc.in += transaction.amount_cents;
        } else {
          acc.out += Math.abs(transaction.amount_cents);
        }
        return acc;
      },
      { total: 0, in: 0, out: 0 },
    );

    setStats(stats);
  };

  const handleAddTransaction = async (newTransaction) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert([newTransaction]);

    if (error) {
      console.error("Error adding transaction:", error);
    } else {
      setIsDialogOpen(false);
      fetchTransactions();
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transaction Dashboard</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              intentions={intentions}
              categories={categories}
              onSubmit={handleAddTransaction}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Money In</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.in.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Money Out</p>
                <p className="text-xl font-bold text-red-600">
                  {stats.out.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <BarChart
              data={[
                { name: 'Jan', total: 1000 },
                { name: 'Feb', total: 1200 },
                { name: 'Mar', total: 900 },
                { name: 'Apr', total: 1100 },
                { name: 'May', total: 1500 },
              ]}
            /> */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <LineChart
              data={[
                { name: 'Jan', income: 2000, expenses: 1000 },
                { name: 'Feb', income: 2200, expenses: 1200 },
                { name: 'Mar', income: 1900, expenses: 900 },
                { name: 'Apr', income: 2100, expenses: 1100 },
                { name: 'May', income: 2500, expenses: 1500 },
              ]}
            /> */}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <Label>Date Range</Label>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.start ? (
                  format(dateRange.start, "PPP")
                ) : (
                  <span>Start date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.start}
                onSelect={(date) =>
                  handleDateRangeChange({ ...dateRange, start: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.end ? (
                  format(dateRange.end, "PPP")
                ) : (
                  <span>End date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.end}
                onSelect={(date) =>
                  handleDateRangeChange({ ...dateRange, end: date })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            onClick={() => handleDateRangeChange({ start: null, end: null })}
          >
            Reset
          </Button>
        </div>
        <div className="flex space-x-2 mt-2">
          <Button
            onClick={() =>
              handleDateRangeChange({
                start: new Date(new Date().setDate(new Date().getDate() - 7)),
                end: new Date(),
              })
            }
          >
            Last Week
          </Button>
          <Button
            onClick={() =>
              handleDateRangeChange({
                start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                end: new Date(),
              })
            }
          >
            Last Month
          </Button>
          <Button
            onClick={() =>
              handleDateRangeChange({
                start: new Date(
                  new Date().setFullYear(new Date().getFullYear() - 1),
                ),
                end: new Date(),
              })
            }
          >
            Last Year
          </Button>
          <Button
            onClick={() => handleDateRangeChange({ start: null, end: null })}
          >
            All Time
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Intention</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {transaction.category_id && (
                  <Icon
                    name={categoriesDictionary[transaction.category_id]}
                    color="red"
                    size={20}
                  />
                )}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>
                {transaction.amount_cents.toFixed(2)} {transaction.currency}
              </TableCell>
              <TableCell>{transaction.intention_id}</TableCell>
              <TableCell>{format(new Date(transaction.date), "PPP")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
