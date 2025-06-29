import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <main className="flex-1">{children}</main>;
};

export default Layout;
