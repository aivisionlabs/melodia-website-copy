import React from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";

// Single Responsibility: Component handles password field with show/hide functionality
interface PasswordFieldProps {
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  showPassword,
  onToggleVisibility,
}) => {
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      required={required}
      value=""
      onChange={() => {}}
    >
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full h-14 bg-white border text-melodia-teal placeholder-melodia-teal/60 rounded-xl p-3 focus:ring-2 focus:ring-melodia-yellow focus:border-transparent transition pr-10 ${
            error ? "border-red-500" : "border-melodia-teal/20"
          }`}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-melodia-teal/60 hover:text-melodia-teal transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>
    </FormField>
  );
};
