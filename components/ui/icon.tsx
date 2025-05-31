import { ElementType } from "react";
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
  return null;
  loaded[name as keyof typeof dynamicIconImports] ||= dynamic(
    dynamicIconImports[name as keyof typeof dynamicIconImports],
  );
  const LucideIcon = loaded[name as keyof typeof dynamicIconImports];

  return LucideIcon ? <LucideIcon {...props} /> : null;
};

export const Icon = ({ name, className }: IconProps) => {
  return <div className={cn(`icon-${name}`, className)}></div>;
};
