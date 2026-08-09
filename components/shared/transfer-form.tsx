"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { format, getYear, parse } from "date-fns";
import { CalendarDays, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AmountFormValue,
  getAmountFormValue,
  normalizeAmountFormValue,
} from "./amount-form-value";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import WalletPicker from "./wallet-picker";

import { EntityForm } from "@/components/shared/entity-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWallets } from "@/contexts/settings-context";
import type { TransferPrefill } from "@/contexts/transaction-form-context";
import {
  type TransferTransactionValues,
  useCreateTransferTransaction,
} from "@/hooks/use-create-transfer-transaction";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { createClient } from "@/utils/supabase/client";
import { deleteTransfer, updateTransfer } from "@/utils/supabase/mutations";
import { Transaction, Wallet } from "@/utils/supabase/types";

interface TransferFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  initialData?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  transferPrefill?: TransferPrefill;
}

type TransferFormValues = Omit<
  TransferTransactionValues,
  "sender_amount" | "receiver_amount"
> & {
  sender_amount: AmountFormValue;
  receiver_amount: AmountFormValue;
};

type TransferTransaction = Transaction & {
  transfer_id?: string | null;
  transfer_wallet_id?: string | null;
};

export function normalizeTransferAmounts({
  senderAmount,
  receiverAmount,
  senderCurrency,
  receiverCurrency,
}: {
  senderAmount: AmountFormValue;
  receiverAmount: AmountFormValue;
  senderCurrency?: string;
  receiverCurrency?: string;
}) {
  const normalizedSenderAmount = Math.abs(
    normalizeAmountFormValue(senderAmount),
  );
  const normalizedReceiverAmount =
    senderCurrency && senderCurrency === receiverCurrency
      ? normalizedSenderAmount
      : Math.abs(normalizeAmountFormValue(receiverAmount));

  return {
    senderAmount: normalizedSenderAmount,
    receiverAmount: normalizedReceiverAmount,
  };
}

export function getTransferPairValues(
  transactions: Array<
    Pick<
      Transaction,
      | "amount_cents"
      | "category_id"
      | "date"
      | "description"
      | "label_id"
      | "type"
      | "wallet_id"
    >
  >,
): TransferFormValues {
  if (transactions.length !== 2) {
    throw new Error("Invalid transfer: expected exactly 2 transactions");
  }

  const sender = transactions.find(
    (transaction) => transaction.amount_cents < 0,
  );
  const receiver = transactions.find(
    (transaction) => transaction.amount_cents > 0,
  );
  if (!sender || !receiver) {
    throw new Error(
      "Invalid transfer: expected one outgoing and one incoming leg",
    );
  }

  return {
    type: sender.type,
    sender_wallet_id: sender.wallet_id,
    receiver_wallet_id: receiver.wallet_id,
    date: sender.date,
    description: sender.description ?? undefined,
    sender_amount: getAmountFormValue(Math.abs(sender.amount_cents) / 100),
    receiver_amount: getAmountFormValue(receiver.amount_cents / 100),
    category_id: sender.category_id,
    label_id: sender.label_id ?? "",
  };
}

function WalletFieldWithConstraint({
  field,
  otherFieldName,
  walletId,
  exclude,
  placeholder,
}: {
  field: {
    value: string;
    onChange: (value: string) => void;
  };
  otherFieldName: "sender_wallet_id" | "receiver_wallet_id";
  walletId: string;
  exclude?: string;
  placeholder: string;
}) {
  const { setValue } = useFormContext<TransferFormValues>();

  const handleChange = (value: string) => {
    field.onChange(value);
    if (value !== walletId) {
      setValue(otherFieldName, walletId, { shouldValidate: true });
    }
  };

  return (
    <WalletPicker
      size="sm"
      icon={<WalletCards className="size-4" />}
      placeholder={placeholder}
      className="w-auto max-w-64 rounded-full"
      value={field.value}
      exclude={exclude}
      onChange={handleChange}
    />
  );
}

function TransferAmountFields({
  walletMap,
}: {
  walletMap: Map<string, Wallet>;
}) {
  const { control } = useFormContext<TransferFormValues>();
  const senderWalletId = useWatch({ control, name: "sender_wallet_id" });
  const receiverWalletId = useWatch({ control, name: "receiver_wallet_id" });
  const senderCurrency = walletMap.get(senderWalletId)?.currency;
  const receiverCurrency = walletMap.get(receiverWalletId)?.currency;
  const hasDifferentCurrencies =
    !!senderCurrency &&
    !!receiverCurrency &&
    senderCurrency !== receiverCurrency;

  return (
    <div className={hasDifferentCurrencies ? "space-y-6" : undefined}>
      <FormField
        name="sender_amount"
        rules={{
          required: "Amount sent is required",
          min: { value: 0.01, message: "Amount must be positive" },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel
              className={
                hasDifferentCurrencies
                  ? "text-muted-foreground text-xs font-normal uppercase"
                  : "sr-only"
              }
            >
              {hasDifferentCurrencies ? "Origin amount" : "Amount"}
            </FormLabel>
            <FormControl>
              <AmountInput
                {...field}
                currency={senderCurrency}
                autoFocus
                variant="ghost"
                symbolClassName="text-xl md:text-2xl"
                className="h-auto [appearance:textfield] px-2 text-4xl font-semibold shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none sm:text-4xl lg:text-4xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {hasDifferentCurrencies ? (
        <FormField
          name="receiver_amount"
          rules={{
            required: "Amount received is required",
            min: { value: 0.01, message: "Amount must be positive" },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground text-xs font-normal uppercase">
                Destination amount
              </FormLabel>
              <FormControl>
                <AmountInput
                  {...field}
                  currency={receiverCurrency}
                  variant="ghost"
                  symbolClassName="text-xl md:text-2xl"
                  className="h-auto [appearance:textfield] px-2 text-4xl font-semibold shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none sm:text-4xl lg:text-4xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}

function TransferWalletFields({ walletId }: { walletId: string }) {
  const { control } = useFormContext<TransferFormValues>();
  const senderWalletId = useWatch({ control, name: "sender_wallet_id" });
  const receiverWalletId = useWatch({ control, name: "receiver_wallet_id" });

  return (
    <>
      <FormField
        name="sender_wallet_id"
        rules={{ required: "Sender wallet is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Sender Wallet</FormLabel>
            <FormControl>
              <WalletFieldWithConstraint
                field={field}
                otherFieldName="receiver_wallet_id"
                walletId={walletId}
                exclude={receiverWalletId}
                placeholder="Origin wallet"
              />
            </FormControl>
            <FormMessage className="sr-only" />
          </FormItem>
        )}
      />

      <FormField
        name="receiver_wallet_id"
        rules={{ required: "Receiver wallet is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Receiver Wallet</FormLabel>
            <FormControl>
              <WalletFieldWithConstraint
                field={field}
                otherFieldName="sender_wallet_id"
                walletId={walletId}
                exclude={senderWalletId}
                placeholder="Destination wallet"
              />
            </FormControl>
            <FormMessage className="sr-only" />
          </FormItem>
        )}
      />
    </>
  );
}

function TransferDateField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-full font-normal"
        >
          <CalendarDays className="size-4" />
          {selectedDate
            ? format(
                selectedDate,
                getYear(selectedDate) === getYear(new Date())
                  ? "MMM d"
                  : "MMM d, yyyy",
              )
            : "Date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        avoidCollisions={false}
        style={{ zIndex: 2147483647 }}
        className="w-80 p-0"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : undefined);
            if (date) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const TransferForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
  open,
  onOpenChange,
  transferPrefill,
}: TransferFormProps) => {
  const [, walletMap] = useWallets();
  const [addAnother, setAddAnother] = useState(false);
  const isEdit = !!initialData;
  const queryClient = useQueryClient();
  const createMutation = useCreateTransferTransaction();
  const transferId = (initialData as TransferTransaction | undefined)
    ?.transfer_id;

  const transferPairQuery = useQuery({
    queryKey: ["transfer", transferId],
    queryFn: async () => {
      if (!transferId) throw new Error("No transfer ID provided");

      const { data, error } = await createClient()
        .from("transactions")
        .select("*")
        .eq("transfer_id", transferId);

      if (error) throw new Error(error.message);
      return getTransferPairValues(data ?? []);
    },
    enabled: !!open && isEdit && !!transferId,
  });

  useEffect(() => {
    if (transferPairQuery.error) {
      toast.error(transferPairQuery.error.message);
    }
  }, [transferPairQuery.error]);

  const updateMutation = useMutation({
    mutationFn: async (values: TransferTransactionValues) => {
      const transferId = (initialData as TransferTransaction | undefined)
        ?.transfer_id;
      if (!transferId) throw new Error("No transfer ID provided");
      await updateTransfer(transferId, {
        description: values.description ?? undefined,
        sender_amount_cents: Math.round(values.sender_amount * 100),
        receiver_amount_cents: Math.round(values.receiver_amount * 100),
      });
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const transferId = (initialData as TransferTransaction | undefined)
        ?.transfer_id;
      if (!transferId) throw new Error("No transfer ID provided");
      await deleteTransfer(transferId);
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
    },
  });

  const defaultSenderWalletId = transferPrefill?.senderWalletId ?? walletId;
  const defaultReceiverWalletId = transferPrefill?.receiverWalletId ?? "";
  const defaultSenderAmount = transferPrefill?.senderAmount;
  const defaultReceiverAmount = transferPrefill?.receiverAmount;
  const isDefaultSameCurrency =
    !!defaultReceiverWalletId &&
    walletMap.get(defaultSenderWalletId)?.currency ===
      walletMap.get(defaultReceiverWalletId)?.currency;
  const defaultValues: TransferFormValues = {
    converted_transaction_id: transferPrefill?.transactionIdToConvert,
    converted_transaction_wallet_id: transferPrefill?.transactionIdToConvert
      ? walletId
      : undefined,
    type: initialData?.type ?? type,
    sender_wallet_id: defaultSenderWalletId,
    receiver_wallet_id: defaultReceiverWalletId,
    date: transferPrefill?.date ?? initialData?.date ?? date,
    description:
      transferPrefill?.description ?? initialData?.description ?? undefined,
    sender_amount: getAmountFormValue(defaultSenderAmount),
    receiver_amount: getAmountFormValue(
      defaultReceiverAmount ??
        (isDefaultSameCurrency ? defaultSenderAmount : undefined),
    ),
    category_id:
      initialData?.category_id ??
      process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
    label_id: initialData?.label_id ?? "",
  };

  const handleSubmit = async (data: TransferFormValues) => {
    const senderCurrency = walletMap.get(data.sender_wallet_id)?.currency;
    const receiverCurrency = walletMap.get(data.receiver_wallet_id)?.currency;
    const { senderAmount, receiverAmount } = normalizeTransferAmounts({
      senderAmount: data.sender_amount,
      receiverAmount: data.receiver_amount,
      senderCurrency,
      receiverCurrency,
    });
    const normalizedData: TransferTransactionValues = {
      ...data,
      sender_amount: senderAmount,
      receiver_amount: receiverAmount,
    };

    if (isEdit) {
      try {
        await updateMutation.mutateAsync(normalizedData);
        return { error: undefined };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    try {
      await createMutation.mutateAsync(normalizedData);

      if (addAnother) {
        // Reset all fields except date, using fresh default values
        const prevDate = normalizedData.date;
        const resetValues: TransferFormValues = {
          converted_transaction_id: undefined,
          converted_transaction_wallet_id: undefined,
          type: type,
          sender_wallet_id: walletId,
          receiver_wallet_id: "",
          date: prevDate,
          description: undefined,
          sender_amount: "",
          receiver_amount: "",
          category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
          label_id: "",
        };

        return {
          error: undefined,
          resetValues,
        };
      }

      return { error: undefined };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const getFallbackEditValues = (
    transaction: Transaction,
  ): TransferFormValues => {
    const counterWalletId =
      (transaction as TransferTransaction).transfer_wallet_id ?? "";
    const isSender = transaction.amount_cents < 0;

    return {
      type: transaction.type,
      sender_wallet_id: isSender ? transaction.wallet_id : counterWalletId,
      receiver_wallet_id: isSender ? counterWalletId : transaction.wallet_id,
      date: transaction.date,
      description: transaction.description ?? undefined,
      sender_amount: getAmountFormValue(
        Math.abs(transaction.amount_cents) / 100,
      ),
      receiver_amount: getAmountFormValue(
        Math.abs(transaction.amount_cents) / 100,
      ),
      category_id: transaction.category_id,
      label_id: transaction.label_id ?? "",
    };
  };

  const editValues =
    transferPairQuery.data ??
    (initialData ? getFallbackEditValues(initialData) : undefined);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      return { error: undefined };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return (
    <EntityForm
      title="Transfer"
      appearance="transaction"
      entity={editValues}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      addAnother={addAnother}
      setAddAnother={setAddAnother}
      onDelete={handleDelete}
      isLoading={
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending ||
        (isEdit && (transferPairQuery.isLoading || !!transferPairQuery.error))
      }
      footerFields={
        !isEdit ? (
          <>
            <TransferWalletFields walletId={walletId} />
            <FormField
              name="date"
              rules={{ required: "Date is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Date</FormLabel>
                  <FormControl>
                    <TransferDateField {...field} />
                  </FormControl>
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />
          </>
        ) : undefined
      }
    >
      {transferPrefill?.transactionIdToConvert ? (
        <div
          className="border-border bg-muted/50 rounded-md border px-3 py-2 text-sm"
          role="note"
        >
          <p className="font-medium">Convert this transaction</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            This transaction will become one side of the transfer. Its amount,
            date, and description will be reused.
          </p>
        </div>
      ) : null}

      <TransferAmountFields walletMap={walletMap} />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Description</FormLabel>
            <FormControl>
              <DescriptionInput
                {...field}
                value={field.value ?? ""}
                variant="ghost"
                placeholder="Add description…"
                className="h-auto px-0 py-2 text-lg shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </EntityForm>
  );
};

export default TransferForm;
