import { cva } from "class-variance-authority";
import Button from "./Button";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const actionButtonStyles = cva(
  "inline-flex items-center justify-center h-[38px] rounded-xl px-4 gap-1.5 text-sm font-semibold transition-all duration-200 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-lg",
        secondary:
          "bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600 hover:shadow-lg",
        edit: "bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-100 hover:shadow-lg",
        delete:
          "bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-100 hover:shadow-lg",
        ghost:
          "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-700 hover:shadow-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

const iconMap = {
  primary: Plus,
  secondary: Plus,
  edit: Pencil,
  delete: Trash2,
  ghost: X,
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const ActionButton = ({
  variant = "primary",
  icon,
  iconPosition = "start",
  fullWidth = false,
  className = "",
  children,
  ...props
}) => {
  const Icon = icon || iconMap[variant];

  return (
    <Button
      variant="none"
      icon={Icon}
      iconPosition={iconPosition}
      className={cn(actionButtonStyles({ variant, fullWidth }), className)}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ActionButton;
