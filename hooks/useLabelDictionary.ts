import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { createClient } from "@/utils/supabase/client";
import { listLabels } from "@/utils/supabase/queries";
import { Label } from "@/utils/supabase/types";

const useLabelDictionary = () => {
  const supabase = createClient();
  const { data } = useQuery(listLabels(supabase), {
    select(res) {
      const data = res.data?.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {});
      return { ...res, data };
    },
  });

  return (data ?? {}) as any as Record<string, Label>;
};

export default useLabelDictionary;
