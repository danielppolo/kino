import React from "react";

import { RowLoading } from "../ui/row";

export default function SettingsListLoading({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{ height: "calc(100vh - 44px)", overflow: "auto" }}
      className="relative mt-11 w-full overflow-hidden"
    >
      {children ??
        Array.from({ length: 20 }).map((_, index) => (
          <RowLoading key={index} />
        ))}
    </div>
  );
}
