"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import LabelForm from "./label-form";

import { Button } from "@/components/ui/button";

const AddLabelButton = () => {
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
      <LabelForm
        onSuccess={() => {
          setOpen(false);
        }}
      />
    </DrawerDialog>
  );
};

export default AddLabelButton;
