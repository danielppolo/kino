"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Color from "./color";
import CurrencyPicker from "./currency-picker";

import { SubmitButton } from "@/components/submit-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createWallet, updateWallet } from "@/utils/supabase/mutations";
import { Wallet } from "@/utils/supabase/types";

interface WalletFormProps {
  onSuccess: () => void;
  wallet?: Wallet; // Optional wallet for editing mode
}

type WalletFormValues = Database["public"]["Tables"]["wallets"]["Insert"];

const WalletForm = ({ onSuccess, wallet }: WalletFormProps) => {
  const isEditing = !!wallet;

  const form = useForm<WalletFormValues>({
    defaultValues: {
      name: wallet?.name || "",
      currency: wallet?.currency || "MXN",
      color: wallet?.color || COLORS[0],
      notes: wallet?.notes || "",
    },
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (walletData: WalletFormValues) => {
      return await createWallet(walletData);
    },
    onSuccess: () => {
      toast.success("Wallet added!");
      queryClient.invalidateQueries();
      onSuccess();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error("Failed to add wallet");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (walletData: WalletFormValues) => {
      if (!wallet?.id) throw new Error("Wallet ID is required for updates");
      return await updateWallet({
        id: wallet.id,
        name: walletData.name,
        currency: walletData.currency,
        color: walletData.color,
        notes: walletData.notes,
      });
    },
    onSuccess: () => {
      toast.success("Wallet updated!");
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      onSuccess();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error("Failed to update wallet");
    },
  });

  const onSubmit = (walletData: WalletFormValues) => {
    if (isEditing) {
      updateMutation.mutate(walletData);
    } else {
      createMutation.mutate(walletData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex items-center justify-center"
                      >
                        <Color color={field.value || COLORS[0]} size="md" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full">
                      <ToggleGroup
                        type="single"
                        value={field.value || COLORS[0]}
                        onValueChange={field.onChange}
                        className="grid grid-cols-8"
                      >
                        {COLORS?.map((color) => (
                          <ToggleGroupItem key={color} value={color} size="sm">
                            <Color color={color} size="sm" />
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input type="text" placeholder="Enter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CurrencyPicker
                  onChange={field.onChange}
                  value={field.value}
                  disabled={isEditing}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Notes (optional)"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton isLoading={isPending} className="w-full">
          {isEditing ? "Update wallet" : "Add wallet"}
        </SubmitButton>
      </form>
    </Form>
  );
};

export default WalletForm;
