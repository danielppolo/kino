"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Category from "./category";

import CategoryForm from "@/components/shared/category-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";

interface CategoriesProps {
  type: "income" | "expense";
  title: string;
}

const supabase = createClient();

export default function CategorySection({ type, title }: CategoriesProps) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery(listCategories(supabase));

  const categories = data?.filter((category) => category.type === type);

  return (
    <div>
      <div className="flex space-between w-full">
        <Collapsible open={open}>
          <div className="flex space-between w-full">
            <h2>{title}</h2>

            <CollapsibleTrigger
              asChild
              onClick={() => {
                setOpen(!open);
              }}
            >
              <Button size="sm" variant="ghost">
                <Plus className="size-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <CategoryForm
              type={type}
              onSuccess={() => {
                setOpen(false);
              }}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div>
        {categories?.map((category) => (
          <Category key={category.id} data={category} />
        ))}
      </div>
    </div>
  );
}
