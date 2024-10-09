import { Label } from "@/utils/supabase/types";

const useLabelDictionary = (data: Label[]) => {
  return data.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});
};

export default useLabelDictionary;
