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
  const baseStyles = "inline-flex items-center justify-center font-display uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border";
  
  const variants = {
    primary: "bg-emerald-900 border-emerald-700 text-emerald-100 hover:bg-emerald-800 hover:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    secondary: "bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500",
    danger: "bg-red-900/50 border-red-800 text-red-200 hover:bg-red-900 hover:border-red-500",
    ghost: "bg-transparent border-transparent text-stone-400 hover:text-stone-100 hover:bg-stone-800/50"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5 rounded-sm",
    md: "text-sm px-5 py-2.5 gap-2 rounded",
    lg: "text-base px-8 py-3 gap-3 rounded-md"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};