export interface ListItemProps {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  active,
  className,
}) => {
  return (
    <div
      className={`flex h-12 cursor-pointer items-center rounded-md p-2 hover:bg-muted/20 ${
        active ? "bg-muted/80" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};
