import { BillRowLoading } from "@/components/shared/bill-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <BillRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}

