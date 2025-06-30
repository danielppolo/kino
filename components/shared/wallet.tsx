import { Money } from "../ui/money";
import { Wallet as WalletType } from "@/utils/supabase/types";

const Wallet = ({ name, color, currency, balance_cents }: WalletType) => {
  return (
    <div
      className="flex h-28 flex-col justify-end rounded-2xl p-4 text-white"
      style={{
        backgroundColor: color ?? "#6366F1",
      }}
    >
      <div className="flex flex-col gap-2">
        <p className="font-xl leading-1 font-medium">{name}</p>
        <Money
          cents={balance_cents ?? 0}
          currency={currency}
          className="text font-light text-white/80"
        />
      </div>
    </div>
  );
};

export default Wallet;
