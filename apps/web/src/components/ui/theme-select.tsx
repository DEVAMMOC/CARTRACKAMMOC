'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Base UI <Select.Value> shows the raw value unless Root gets `items` mapping
// value -> label (e.g. "system" -> "Sistema").
const THEME_ITEMS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]

export function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <Select
      items={THEME_ITEMS}
      value={mounted ? theme ?? 'system' : 'system'}
      onValueChange={(value) => setTheme(value ?? 'system')}
      disabled={!mounted}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tema" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">Sistema</SelectItem>
        <SelectItem value="light">Claro</SelectItem>
        <SelectItem value="dark">Escuro</SelectItem>
      </SelectContent>
    </Select>
  )
}
