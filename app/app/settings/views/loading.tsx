import { ViewRowLoading } from "@/components/shared/view-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <ViewRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}
