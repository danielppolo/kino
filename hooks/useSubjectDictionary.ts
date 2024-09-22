import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { createClient } from "@/utils/supabase/client";
import { listSubjects } from "@/utils/supabase/queries";
import { Subject } from "@/utils/supabase/types";

const useSubjectDictionary = () => {
  const supabase = createClient();
  const { data } = useQuery(listSubjects(supabase), {
    select(res) {
      const data = res.data?.reduce((acc, subject) => {
        acc[subject.id] = subject;
        return acc;
      }, {});
      return { ...res, data };
    },
  });

  return (data ?? {}) as any as Record<string, Subject>;
};

export default useSubjectDictionary;
