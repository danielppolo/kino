import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ walletId: string }>;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  return children;
};

export default Layout;
