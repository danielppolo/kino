import React, { ElementType } from "react";
import { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

interface IconProps extends LucideProps {
  name: string;
}

const loaded: Partial<Record<keyof typeof dynamicIconImports, ElementType>> =
  {};

export const LazyIcon = ({ name, ...props }: IconProps) => {
  if (!loaded[name as keyof typeof dynamicIconImports]) {
    loaded[name as keyof typeof dynamicIconImports] = dynamic(
      dynamicIconImports[name as keyof typeof dynamicIconImports],
    ) as ElementType;
  }
  const LucideIcon = loaded[name as keyof typeof dynamicIconImports];
  if (!LucideIcon) return null;
  const Component = LucideIcon as React.ComponentType<LucideProps>;
  return <Component {...props} />;
};

export const Icon = ({ name, className }: IconProps) => {
  return <div className={cn(`icon-${name}`, className)}></div>;
};
