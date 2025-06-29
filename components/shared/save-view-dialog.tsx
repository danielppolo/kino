"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createView } from "@/utils/supabase/mutations";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ViewFormValues {
  name: string;
}

export default function SaveViewDialog({ open, onOpenChange }: SaveViewDialogProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const form = useForm<ViewFormValues>({ defaultValues: { name: "" } });

  const mutation = useMutation({
    mutationFn: async (values: ViewFormValues) => {
      const query_params = searchParams.toString();
      await createView({ name: values.name, query_params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views"] });
      toast.success("View saved");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to save view");
    },
  });

  const onSubmit = (values: ViewFormValues) => mutation.mutate(values);

  return (
    <DrawerDialog title="Save View" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="View name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            Save
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
}
