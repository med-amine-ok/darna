"use client";

import React, { useCallback } from "react";
import { AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";

type Props = {
  title: string;
  subtitle: string;
  value: number;
  onChange: (value: number) => void;
};

function Counter({ title, subtitle, value, onChange }: Props) {
  const onAdd = useCallback(() => {
    onChange(value + 1);
  }, [onChange, value]);

  const onReduce = useCallback(() => {
    if (value === 1) {
      return;
    }

    onChange(value - 1);
  }, [value, onChange]);

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-col">
        <div className="font-medium">{title}</div>
        <div className="font-light text-gray-600">{subtitle}</div>
      </div>
      <div className="flex flex-row items-center gap-4">
        <button
          type="button"
          aria-label="Decrease"
          onClick={onReduce}
          disabled={value <= 1}
          className="w-11 h-11 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-neutral-800 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition touch-manipulation cursor-pointer"
        >
          <AiOutlineMinus size={15} />
        </button>
        <div className="font-semibold text-lg text-neutral-800 min-w-[24px] text-center select-none">
          {value}
        </div>
        <button
          type="button"
          aria-label="Increase"
          onClick={onAdd}
          className="w-11 h-11 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-600 hover:border-neutral-800 hover:text-neutral-900 transition touch-manipulation cursor-pointer"
        >
          <AiOutlinePlus size={15} />
        </button>
      </div>
    </div>
  );
}

export default Counter;
