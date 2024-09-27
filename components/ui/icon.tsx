import { ElementType } from "react";
import { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import dynamic from "next/dynamic";

interface IconProps extends LucideProps {
  name: string;
}

const loaded: Partial<Record<keyof typeof dynamicIconImports, ElementType>> =
  {};

const Icon = ({ name, ...props }: IconProps) => {
  loaded[name as keyof typeof dynamicIconImports] ||= dynamic(
    dynamicIconImports[name as keyof typeof dynamicIconImports],
  );
  const LucideIcon = loaded[name as keyof typeof dynamicIconImports];

  return LucideIcon ? <LucideIcon {...props} /> : null;
};

export { Icon };
