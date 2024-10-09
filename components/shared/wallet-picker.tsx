"use client";

import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { Wallet } from "@/utils/supabase/types";

interface WalletPickerProps {
  options: Wallet[];
  value?: string;
  onChange: (id: string) => void;
}

const WalletPicker: React.FC<WalletPickerProps> = ({
  options,
  onChange,
  value,
}) => {
  return (
    <Select onValueChange={onChange} defaultValue={value ?? undefined}>
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {options?.map((wallet) => (
          <SelectItem key={wallet.id} value={wallet.id}>
            {wallet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default WalletPicker;
