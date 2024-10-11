"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Label from "./label";

import LabelForm from "@/components/shared/label-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLabels } from "@/contexts/settings-context";

export default function LabelSection() {
  const [open, setOpen] = useState(false);
  const labels = useLabels();

  return (
    <div>
      <div className="flex space-between w-full">
        <Collapsible open={open}>
          <div className="flex space-between w-full">
            <h2>Labels</h2>

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
            <LabelForm
              onSuccess={() => {
                setOpen(false);
              }}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div>{labels?.map((label) => <Label key={label.id} data={label} />)}</div>
    </div>
  );
}
