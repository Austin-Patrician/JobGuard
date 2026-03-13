import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-500 focus-visible:outline-primary-600",
  secondary:
    "bg-gray-600 text-white hover:bg-gray-500 focus-visible:outline-gray-600",
  outline:
    "border border-gray-300 bg-transparent hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
  ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-semibold shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
