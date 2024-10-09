"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createLabel } from "@/utils/supabase/mutations";

interface LabelFormProps {
  onSuccess: () => void;
}

type LabelFormValues = Database["public"]["Tables"]["labels"]["Insert"];

const LabelForm = ({ onSuccess }: LabelFormProps) => {
  const form = useForm<LabelFormValues>({
    defaultValues: {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });

  const onSubmit = async (label: LabelFormValues) => {
    const { error } = await createLabel(label);

    if (error) {
      return toast.error(error.message);
    }

    toast.success("Label added successfully!");
    onSuccess?.();
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
