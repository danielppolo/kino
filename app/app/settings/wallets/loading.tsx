import { WalletRowLoading } from "@/components/shared/wallet-row";
import SettingsListLoading from "@/components/shared/settings-list-loading";

export default function Loading() {
  return (
    <SettingsListLoading>
      {Array.from({ length: 20 }).map((_, index) => (
        <WalletRowLoading key={index} />
      ))}
    </SettingsListLoading>
  );
}
