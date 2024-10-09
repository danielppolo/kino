import React, { ReactNode } from "react";

interface MenuProps {
  children: ReactNode;
  title: string;
}

export const Menu: React.FC<MenuProps> = ({ children, title }) => {
  return (
    <div className="">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="">{children}</div>
    </div>
  );
};

interface MenuItemProps {
  label: string;
  active: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ label, active }) => {
  return (
    <div
      className={`p-1 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted/40 ${
        active ? "bg-gray-800" : ""
      }`}
    >
      <p>{label}</p>
    </div>
  );
};
