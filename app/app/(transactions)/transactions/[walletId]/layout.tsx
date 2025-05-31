import React from "react";

import Container from "@/components/shared/container";
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ walletId: string }>;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  return <Container>{children}</Container>;
};

export default Layout;
