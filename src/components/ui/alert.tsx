import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-foreground [&>svg~*]:pl-6",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border/80",
        destructive:
          "border-rose-500/40 text-rose-600 dark:text-rose-400 [&>svg]:text-rose-500 bg-rose-500/10",
        warning:
          "border-amber-500/40 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500 bg-amber-500/10",
        info:
          "border-blue-500/40 text-blue-600 dark:text-blue-400 [&>svg]:text-blue-500 bg-blue-500/10",
        success:
          "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 [&>svg]:text-emerald-500 bg-emerald-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold text-xs leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs [&_p]:leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
