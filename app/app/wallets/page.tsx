import WalletSection from "../settings/(components)/wallet-section";

import { Title } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="p-4">
      <div className="mb-2 mt-4">
        <Title>Wallets</Title>
      </div>
      <WalletSection />
    </div>
  );
}
