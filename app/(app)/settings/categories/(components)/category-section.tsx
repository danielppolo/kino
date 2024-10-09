"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Category from "./category";

import CategoryForm from "@/components/shared/category-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoriesProps {
  data: CategoryType[];
  type: "income" | "expense";
  title: string;
}

export default function CategorySection({
  type,
  title,
  data,
}: CategoriesProps) {
  const [open, setOpen] = useState(false);

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
        {data?.map((category) => (
          <Category key={category.id} data={category} />
        ))}
      </div>
    </div>
  );
}
