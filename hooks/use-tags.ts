"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import { listTags } from "@/utils/supabase/queries";
import { Tag } from "@/utils/supabase/types";

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await listTags(supabase);
      console.log(data);
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.title.localeCompare(b.title));
    },
  });
}
