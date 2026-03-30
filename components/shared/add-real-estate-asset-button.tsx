"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { RealEstateAssetForm } from "@/components/shared/real-estate-asset-form";
import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";

export function AddRealEstateAssetButton() {
  const [open, setOpen] = useState(false);

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Add real-estate asset"
      description="Create an informational property record for AI-ready reporting."
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-4" />
        </Button>
      }
    >
      <RealEstateAssetForm
        onSuccess={() => {
          setOpen(false);
        }}
      />
    </DrawerDialog>
  );
}

export default AddRealEstateAssetButton;
