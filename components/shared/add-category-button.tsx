"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import CategoryForm from "./category-form";

import { Button } from "@/components/ui/button";

interface AddCategoryButtonProps {
  type: "income" | "expense";
}

const AddCategoryButton = ({ type }: AddCategoryButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Add Label"
      description="Create a new label to start tracking your"
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-4" />
        </Button>
      }
    >
      <CategoryForm
        type={type}
        onSuccess={() => {
          setOpen(false);
        }}
      />
    </DrawerDialog>
  );
};

export default AddCategoryButton;
