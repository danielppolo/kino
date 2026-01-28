"use client";

import React, { ReactNode } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { SettingsProvider } from "@/contexts/settings-context";
import {
  FeatureFlags,
  parseFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from "@/utils/types/feature-flags";

interface WorkspaceSettingsBridgeProps {
  children: ReactNode;
}

export const WorkspaceSettingsBridge: React.FC<
  WorkspaceSettingsBridgeProps
> = ({ children }) => {
  const { activeWorkspace, conversionRates, isLoading } = useWorkspace();

  if (isLoading || !activeWorkspace) {
    return <div>Loading workspace...</div>;
  }

  // Get feature flags from the workspace
  const featureFlags = activeWorkspace.feature_flags
    ? parseFeatureFlags(activeWorkspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  // Get base currency from the workspace
  const baseCurrency = activeWorkspace.base_currency || "USD";

  return (
    <SettingsProvider
      workspaceId={activeWorkspace.id}
      initialConversionRates={conversionRates}
      initialBaseCurrency={baseCurrency}
      initialFeatureFlags={featureFlags}
    >
      {children}
    </SettingsProvider>
  );
};
