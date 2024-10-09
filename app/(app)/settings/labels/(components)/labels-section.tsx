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
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelSectionProps {
  data: LabelType[];
}

export default function LabelSection({ data }: LabelSectionProps) {
  const [open, setOpen] = useState(false);

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

      <div>{data?.map((label) => <Label key={label.id} data={label} />)}</div>
    </div>
  );
}
