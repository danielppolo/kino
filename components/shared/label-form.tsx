"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";

import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Color from "./color";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";

const COLORS = [
  "#B8255F",
  "#DB4035",
  "#FF8D85",
  "#FF9933",
  "#FAD000",
  "#AFB83B",
  "#7ECC49",
  "#299438",
  "#6ACCBC",
  "#158FAD",
  "#14AAF5",
  "#96C3EB",
  "#4073FF",
  "#884DFF",
  "#AF38EB",
  "#B8B8B8",
  "#CCAC93",
];

const supabase = createClient();

interface LabelFormProps {
  onSuccess: () => void;
}

type LabelFormValues = Database["public"]["Tables"]["labels"]["Insert"];

const LabelForm = ({ onSuccess }: LabelFormProps) => {
  const { mutateAsync: insert } = useInsertMutation(
    supabase.from("labels"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Label added successfully!");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const form = useForm<LabelFormValues>({
    defaultValues: {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });

  const onSubmit = (label: LabelFormValues) => {
    insert([label]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-4">
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Color color={field.value} size="sm" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-8"
                    >
                      {COLORS?.map((color) => (
                        <ToggleGroupItem key={color} value={color} size="sm">
                          <Color color={color} size="sm" />
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="text" placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="sm">
          Save
        </Button>
      </form>
    </Form>
  );
};

export default LabelForm;
