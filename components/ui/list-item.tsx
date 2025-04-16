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
      className={`hover:bg-muted/20 flex h-15 cursor-pointer items-center rounded-md ${
        active ? "bg-muted/80" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};
