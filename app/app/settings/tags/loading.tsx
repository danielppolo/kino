import { SelectableRowLoading } from "@/components/shared/selectable-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <SelectableRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}
