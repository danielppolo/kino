import { formatCents } from "@/utils/format-cents";

interface WalletProps {
  name: string;
  color: string;
  currency: string;
  amount: number;
}

const Wallet = ({ name, color, currency, amount }: WalletProps) => {
  return (
    <div
      className="flex h-28 flex-col justify-end rounded-lg p-4 text-white"
      style={{
        backgroundColor: color,
      }}
    >
      <div className="mt-2">
        <span className="font-xl font-medium">{name}</span>
        <p className="text font-light">{formatCents(amount, currency)}</p>
        {/* <p className="text-sm font-light opacity-80">{currency}</p> */}
      </div>
    </div>
  );
};

export default Wallet;
