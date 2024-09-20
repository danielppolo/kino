import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { Database } from "@/utils/supabase/database.types";

interface TransactionFormProps {
  intentions: Database["public"]["Tables"]["intentions"]["Row"][];
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  onSubmit: (
    data: Database["public"]["Tables"]["transactions"]["Insert"],
  ) => void;
}

const TransactionForm = ({
  intentions,
  categories,
  onSubmit,
}: TransactionFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Database["public"]["Tables"]["transactions"]["Insert"]>({
    defaultValues: {
      wallet_id: "bfcf3a6d-8bbb-4aa6-a9fe-4d2cffc38d4d",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Category (Icon) */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={(value) => setValue("category_id", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && (
          <p className="text-red-500">Category is required</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="amount_cents">Amount</Label>
        <Input
          type="number"
          id="amount_cents"
          {...register("amount_cents", { required: true })}
          placeholder="Enter amount"
        />
        {errors.amount_cents && (
          <p className="text-red-500">Amount is required</p>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          type="text"
          id="description"
          {...register("description", { required: true })}
          placeholder="Enter description"
        />
        {errors.description && (
          <p className="text-red-500">Description is required</p>
        )}
      </div>

      {/* Date */}
      <div>
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watch("date") ? (
                format(watch("date"), "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={watch("date")}
              onSelect={(date) => setValue("date", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && <p className="text-red-500">Date is required</p>}
      </div>

      {/* intention (Color) */}
      <div>
        <Label htmlFor="intention">intention</Label>
        <Select onValueChange={(value) => setValue("intention_id", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select intention" />
          </SelectTrigger>
          <SelectContent>
            {intentions.map((intention) => (
              <SelectItem key={intention.id} value={intention.id}>
                <span
                  className="mr-2"
                  style={{
                    backgroundColor: intention.color,
                    width: 16,
                    height: 16,
                  }}
                />
                {intention.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.intention_id && (
          <p className="text-red-500">intention is required</p>
        )}
      </div>

      {/* Currency */}
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Select onValueChange={(value) => setValue("currency", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </SelectContent>
        </Select>
        {errors.currency && (
          <p className="text-red-500">Currency is required</p>
        )}
      </div>

      <Button type="submit">Add Transaction</Button>
    </form>
  );
};

export default TransactionForm;
