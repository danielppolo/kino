"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import TemplateCombobox from "./template-combobox";
import { useFormContext } from "react-hook-form";

import { createTransaction } from "@/actions/create-transaction";
import CategoryCombobox from "@/components/shared/category-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTags, useWallets, useTemplates } from "@/contexts/settings-context";
import useFilters from "@/hooks/use-filters";
import { deleteTransaction } from "@/utils/supabase/mutations";
import { Transaction, TransactionTemplate } from "@/utils/supabase/types";

function TemplateSelect({ type }: { type: "income" | "expense" }) {
  const { setValue } = useFormContext();
  const [templates] = useTemplates();
  const map = useMemo(() => {
    const m = new Map<string, TransactionTemplate>();
    templates.forEach((t) => {
      if (t.type === type) m.set(t.id, t);
    });
    return m;
  }, [templates, type]);

  return (
    <TemplateCombobox
      type={type}
      onSelect={(tpl) => {
        setValue("amount", Math.abs(tpl.amount_cents) / 100);
        setValue("description", tpl.description ?? "");
        setValue("category_id", tpl.category_id ?? "");
        setValue("label_id", tpl.label_id ?? "");
        setValue("tags", tpl.tags ?? []);
      }}
    />
  );
}

export default TemplateSelect;
