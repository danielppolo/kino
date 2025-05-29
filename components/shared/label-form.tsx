"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Color from "./color";

import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createLabel, updateLabel } from "@/utils/supabase/mutations";

interface LabelFormProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  label?: Database["public"]["Tables"]["labels"]["Row"];
}

type LabelFormValues = Database["public"]["Tables"]["labels"]["Insert"];

const LabelForm = ({
  onSuccess,
  open,
  onOpenChange,
  label,
}: LabelFormProps) => {
  const isEdit = !!label;
  const form = useForm<LabelFormValues>({
    defaultValues: label
      ? { ...label }
      : { color: COLORS[Math.floor(Math.random() * COLORS.length)] },
  });

  useEffect(() => {
    if (open) {
      if (label) {
        form.reset({ ...label });
      } else {
        form.reset({
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, open]);

  const onSubmit = async (values: LabelFormValues) => {
    let error;
    if (isEdit) {
      ({ error } = await updateLabel({ ...values, id: label!.id }));
    } else {
      ({ error } = await createLabel(values));
    }
    if (error) {
      return toast.error(error.message);
    }
    toast.success(
      isEdit ? "Label updated successfully!" : "Label added successfully!",
    );
    onSuccess?.();
  };

  return (
    <DrawerDialog
      title={isEdit ? "Edit Label" : "Add Label"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-4">
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
                            <ToggleGroupItem
                              key={color}
                              value={color}
                              size="sm"
                            >
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
          </div>
          <Button type="submit" size="sm" className="w-full">
            {isEdit ? "Save Changes" : "Save"}
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
};

export default LabelForm;
