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

export function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <Select
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
