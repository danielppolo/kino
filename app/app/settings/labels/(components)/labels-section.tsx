"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import Label from "./label";

import LabelForm from "@/components/shared/label-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "@/utils/supabase/client";
import { listLabels } from "@/utils/supabase/queries";

const supabase = createClient();

export default function LabelSection() {
  const [open, setOpen] = useState(false);
  const { data: labels } = useQuery(listLabels(supabase));

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
