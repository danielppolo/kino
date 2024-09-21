import React from "react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { createClient } from "@/utils/supabase/client";
import { listWallets } from "@/utils/supabase/queries";

interface WalletPickerProps {
  value?: string;
  onChange: (id: string) => void;
}

const WalletPicker: React.FC<WalletPickerProps> = ({ onChange, value }) => {
  const supabase = createClient();
  const { data: wallets } = useQuery(listWallets(supabase));

  return (
    <Select onValueChange={onChange} defaultValue={value ?? undefined}>
      <SelectTrigger>
        <SelectValue placeholder="Select subject" />
      </SelectTrigger>
      <SelectContent>
        {wallets?.map((subject) => (
          <SelectItem key={subject.id} value={subject.id}>
            {subject.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default WalletPicker;
