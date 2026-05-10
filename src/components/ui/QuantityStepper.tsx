'use client'

import { useState, useEffect } from 'react'

interface QuantityStepperProps {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

export function QuantityStepper({ value, min, max, onChange }: QuantityStepperProps) {
  // Estado interno para o texto do input (permite apagar e redigitar)
  const [inputValue, setInputValue] = useState(String(value))

  // Sincroniza quando o valor externo muda (ex: limite semanal reduz o max)
  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)

    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)))
    }
  }

  function handleBlur() {
    const parsed = parseInt(inputValue, 10)
    const clamped = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed))
    setInputValue(String(clamped))
    onChange(clamped)
  }

  function step(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta))
    setInputValue(String(next))
    onChange(next)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => step(-1)}
        disabled={value <= min}
        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 text-sm transition-colors flex items-center justify-center select-none"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 text-center text-white text-sm font-mono font-medium bg-gray-800/50 border border-gray-700 rounded-lg py-1 focus:outline-none focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => step(1)}
        disabled={value >= max}
        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 text-sm transition-colors flex items-center justify-center select-none"
      >
        +
      </button>
    </div>
  )
}
