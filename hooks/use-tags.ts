'use client';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/utils/supabase/client';
import { listTags } from '@/utils/supabase/queries';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await listTags(supabase);
      if (error) throw error;
      return data ?? [];
    },
  });
}
