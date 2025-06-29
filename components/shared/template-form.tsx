"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AmountInput } from "./amount-input";
import CategoryCombobox from "./category-combobox";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import { DescriptionInput } from "./description-input";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  createTransactionTemplate,
  updateTransactionTemplate,
  deleteTransactionTemplate,
} from "@/utils/supabase/mutations";
import { Database } from "@/utils/supabase/database.types";
import { TransactionTemplate } from "@/utils/supabase/types";
import { useTags } from "@/contexts/settings-context";

interface TemplateFormProps {
  type: "income" | "expense";
  template?: TransactionTemplate;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TemplateFormValues = {
  id?: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  description?: string;
  category_id: string;
  label_id: string;
  currency: string;
  tags?: string[];
};

const TemplateForm = ({
  type,
  template,
  onSuccess,
  open,
  onOpenChange,
}: TemplateFormProps) => {
  const queryClient = useQueryClient();
  const [availableTags] = useTags();

  const createMutation = useMutation({
    mutationFn: async (values: Database["public"]["Tables"]["transaction_templates"]["Insert"]) =>
      createTransactionTemplate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-templates"] });
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create template",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Database["public"]["Tables"]["transaction_templates"]["Update"]) =>
      updateTransactionTemplate(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-templates"] });
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update template",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!template?.id) throw new Error("No template ID provided");
      return deleteTransactionTemplate(template.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-templates"] });
      onSuccess?.();
    },
  });

  const defaultValues: TemplateFormValues = {
    id: undefined,
    name: "",
    amount: template ? Math.abs(template.amount_cents) / 100 : undefined,
    type,
    description: "",
    category_id: "",
    label_id: "",
    currency: "USD",
    tags: [],
  };

  const convertToFormValues = (
    tpl: TransactionTemplate,
  ): TemplateFormValues => ({
    id: tpl.id,
    name: tpl.name,
    amount: Math.abs(tpl.amount_cents) / 100,
    type: tpl.type,
    description: tpl.description ?? undefined,
    category_id: tpl.category_id ?? "",
    label_id: tpl.label_id ?? "",
    currency: tpl.currency,
    tags: tpl.tags ?? undefined,
  });

  const handleSubmit = async (
    values: TemplateFormValues,
  ): Promise<{ error?: string }> => {
    const payload: Database["public"]["Tables"]["transaction_templates"]["Insert"] = {
      id: values.id,
      name: values.name,
      type: values.type,
      amount_cents:
        values.type === "expense"
          ? Math.round(-values.amount * 100)
          : Math.round(values.amount * 100),
      description: values.description,
      category_id: values.category_id || null,
      label_id: values.label_id || null,
      currency: values.currency,
      tags: values.tags,
    };

    return new Promise((resolve) => {
      if (template) {
        updateMutation.mutate(payload, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to update template",
            }),
        });
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to create template",
            }),
        });
      }
    });
  };

  const handleDelete = () => {
    return new Promise<{ error?: string }>((resolve) => {
      deleteMutation.mutate(undefined, {
        onSuccess: () => resolve({}),
        onError: (error: unknown) =>
          resolve({
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete template",
          }),
      });
    });
  };

  return (
    <EntityForm
      title="Template"
      entity={template ? convertToFormValues(template) : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    >
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <DescriptionInput {...field} placeholder="Template name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <AmountInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CategoryCombobox
                  {...field}
                  type={type}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="label_id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <LabelCombobox {...field} className="w-full" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <TagMultiSelect
                options={availableTags}
                value={field.value || []}
                onChange={field.onChange}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </EntityForm>
  );
};

export default TemplateForm;
