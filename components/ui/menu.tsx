import React, { ReactNode } from "react";

import { ListItem, ListItemProps } from "./list-item";
import { Subheadline } from "./typography";

interface MenuProps {
  children: ReactNode;
  title: string;
}

export const Menu: React.FC<MenuProps> = ({ children, title }) => {
  return (
    <div>
      <Subheadline>{title}</Subheadline>
      <div>{children}</div>
    </div>
  );
};

export const MenuItem: React.FC<ListItemProps> = (props) => (
  <ListItem {...props} />
);
