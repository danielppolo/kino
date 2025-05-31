export interface ListItemProps {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  active,
  className,
  id,
}) => {
  return (
    <div
      id={id}
      className={`hover:bg-muted/20 flex h-14 cursor-pointer items-center rounded-md ${
        active ? "bg-muted/80" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};
