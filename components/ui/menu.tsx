import React, { ReactNode } from "react";

import { ListItem, ListItemProps } from "./list-item";
import { Subtitle, Text } from "./typography";

interface MenuProps {
  children: ReactNode;
  title: string;
}

export const Menu: React.FC<MenuProps> = ({ children, title }) => {
  return (
    <div>
      <Subtitle>{title}</Subtitle>
      <div>{children}</div>
    </div>
  );
};

export const MenuItem: React.FC<ListItemProps> = ({ children, ...props }) => (
  <ListItem {...props}>
    <Text>{children}</Text>
  </ListItem>
);
