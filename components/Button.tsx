import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-display uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border active:scale-95 touch-none";

  const variants = {
    primary: "bg-emerald-950/80 backdrop-blur-md border-emerald-700/50 text-emerald-100 hover:bg-emerald-900 hover:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    secondary: "bg-stone-900/60 backdrop-blur-md border-stone-700/50 text-stone-300 hover:bg-stone-800 hover:border-stone-500 hover:text-stone-100",
    danger: "bg-red-950/40 backdrop-blur-md border-red-900/50 text-red-200 hover:bg-red-900/60 hover:border-red-500",
    ghost: "bg-transparent border-transparent text-stone-500 hover:text-stone-100 hover:bg-white/5"
  };

  const sizes = {
    sm: "text-[10px] px-3 py-1.5 gap-2 rounded sm:text-xs",
    md: "text-xs px-5 py-2.5 gap-2.5 rounded sm:text-sm",
    lg: "text-sm px-8 py-3.5 gap-3 rounded-md sm:text-base"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </button>
  );
};