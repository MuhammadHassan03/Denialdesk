import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", type = "button", ...rest }: ButtonProps) {
  const baseClasses =
    "rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50";
  return <button type={type} className={`${baseClasses} ${className}`} {...rest} />;
}
