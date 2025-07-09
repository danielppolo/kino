import { CategoryRowLoading } from "@/components/shared/category-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <CategoryRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}
