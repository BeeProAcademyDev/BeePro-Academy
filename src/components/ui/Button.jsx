import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cva } from "class-variance-authority";

const buttonStyles = cva(
  "inline-flex items-center justify-center h-11 rounded-xl px-5 gap-2 font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0",
  {
    variants: {
      variant: {
        none: "",
        primary:
          "bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-blue-500 hover:-translate-y-0.5",
        secondary:
          "bg-slate-800 border border-slate-700 text-slate-200 shadow-sm shadow-slate-950/20 hover:bg-slate-700 hover:border-indigo-500 hover:shadow-indigo-500/20 hover:-translate-y-0.5",
        edit: "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white hover:-translate-y-0.5",
        delete:
          "bg-red-500/10 border border-red-500/30 text-red-400 shadow-sm shadow-red-500/30 hover:bg-red-500 hover:text-white hover:-translate-y-0.5",
        ghost:
          "bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-700 hover:-translate-y-0.5",
        outline:
          "border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white",
        danger: "bg-red-500 text-white hover:bg-red-600",
        success: "bg-green-500 text-white hover:bg-green-600",
        link: "text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline",
      },
      size: {
        xs: "text-[12px] gap-1.5",
        sm: "text-sm gap-2",
        md: "text-sm gap-2",
        lg: "text-sm gap-2",
        xl: "text-sm gap-2",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      disabled = false,
      loading = false,
      icon: Icon,
      iconPosition = "start",
      fullWidth = false,
      as = "button",
      to,
      href,
      ...props
    },
    ref,
  ) => {
    const classes =
      `${buttonStyles({ variant, size, fullWidth })} ${className}`.trim();

    const content = (
      <>
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {Icon && iconPosition === "start" && !loading && (
          <Icon className="w-4 h-4" />
        )}
        {children}
        {Icon && iconPosition === "end" && !loading && (
          <Icon className="w-4 h-4" />
        )}
      </>
    );

    if (to) {
      return (
        <Link to={to} ref={ref} className={classes} {...props}>
          {content}
        </Link>
      );
    }

    if (href) {
      return (
        <a
          href={href}
          ref={ref}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {content}
        </a>
      );
    }

    if (as !== "button") {
      const Component = as;
      return (
        <Component
          ref={ref}
          className={classes}
          disabled={disabled || loading}
          {...props}
        >
          {content}
        </Component>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
