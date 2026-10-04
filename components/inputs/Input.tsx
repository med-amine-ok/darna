import React from "react";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { BiDollar } from "react-icons/bi";

type Props = {
  id: string;
  label: string;
  type?: string;
  disabled?: boolean;
  formatPrice?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
};

function Input({
  id,
  label,
  type = "text",
  disabled,
  formatPrice,
  register,
  required,
  errors,
}: Props) {
  return (
    <div className="w-full relative">
      {formatPrice && (
        <span className="text-xs font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded absolute top-5 start-3 pointer-events-none select-none">
          DZD
        </span>
      )}
      <input
        id={id}
        disabled={disabled}
        {...register(id, { required })}
        placeholder=" "
        type={type}
        className={`peer w-full p-4 pt-6 font-normal text-primary bg-white border rounded-xl outline-none transition disabled:opacity-70 disabled:cursor-not-allowed ${
          formatPrice ? "ps-14 pe-4" : "px-4"
        } ${errors[id] ? "border-status-error focus:border-status-error" : "border-tertiary focus:border-primary"} text-start`}
      />
      <label
        htmlFor={id}
        className={`absolute text-md duration-150 transform -translate-y-3 top-5 z-10 origin-top-left rtl:origin-top-right ${
          formatPrice ? "start-14" : "start-4"
        } peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 ${
          errors[id] ? "text-status-error" : "text-neutral-500 peer-focus:text-primary"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default Input;
