import React from "react";

import LayoutTitle from "../(components)/layout-title";
import WalletCurrency from "../(components)/wallet-currency";

import Container from "@/components/shared/container";
import TopBar from "@/components/shared/top-bar";
import { Subtitle } from "@/components/ui/typography";
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ walletId: string }>;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  const { walletId } = await params;
  return (
    <Container>
      <TopBar>
        <LayoutTitle walletId={walletId} />
      </TopBar>
      <div className="flex items-center justify-between">
        <Subtitle>Transactions</Subtitle>
        <WalletCurrency />
      </div>
      {children}
    </Container>
  );
};

export default Layout;
