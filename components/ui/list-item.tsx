import { Text } from "./typography";

export interface ListItemProps {
  label: string;
  active: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({ label, active }) => {
  return (
    <div
      className={`p-1 py-1.5 rounded-sm cursor-pointer hover:bg-muted/20 ${
        active ? "bg-muted/40" : ""
      }`}
    >
      <Text>{label}</Text>
    </div>
  );
};
