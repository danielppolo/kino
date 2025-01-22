import WalletList from "../settings/(components)/wallet-list";

import { Subtitle, Title } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="p-4">
      <Title>Home</Title>
      <Subtitle>Wallets</Subtitle>
      <WalletList />
    </div>
  );
}
