import { TemplateRowLoading } from "@/components/shared/template-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <TemplateRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}
