import { cn } from "@/lib/utils";

export function Title({
  children,
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        `text-foreground scroll-m-20 text-2xl font-medium tracking-tight`,
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function Subtitle({
  children,
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      {...props}
      className={cn(
        "text-muted-foreground scroll-m-20 text-base leading-7 tracking-tight first:mt-0 md:text-sm",
        className,
      )}
    >
      {children}
    </h2>
  );
}

// export function Headline({
//   children,
//   className,
//   ...props
// }: React.ComponentProps<"h3">) {
//   return (
//     <h3
//       {...props}
//       className={cn(
//         "scroll-m-20 text-xl font-semibold tracking-tight text-foreground",
//         className,
//       )}
//     >
//       {children}
//     </h3>
//   );
// }

// export function Subheadline({
//   children,
//   className,
//   ...props
// }: React.ComponentProps<"h4">) {
//   return (
//     <h4
//       {...props}
//       className={cn(
//         "scroll-m-20 text-lg font-medium tracking-tight text-muted-foreground",
//         className,
//       )}
//     >
//       {children}
//     </h4>
//   );
// }

export function Text({
  children,
  className,
  muted,
  destructive,
  strong,
  small,
  as,
  ...props
}: React.ComponentProps<"p"> & {
  muted?: boolean;
  destructive?: boolean;
  strong?: boolean;
  small?: boolean;
  as?: "span";
}) {
  const Component = as ?? (strong ? "strong" : small ? "small" : "p");
  return (
    <Component
      {...props}
      className={cn(
        "text-foreground text-lg leading-7 md:text-sm",
        small && "text-base md:text-sm",
        muted && "text-muted-foreground",
        destructive && "text-foreground",
        className,
      )}
    >
      {children}
    </Component>
  );
}
