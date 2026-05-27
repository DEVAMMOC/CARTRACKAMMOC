'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // next-themes recommends gating on mount to avoid hydration mismatch:
  // the server has no way to know the user's resolved theme, so we render
  // a neutral icon first and swap to the real one after mount.
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const nextLabel = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={nextLabel}
      title={nextLabel}
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-md ' +
        'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ' +
        'transition-colors ' +
        className
      }
    >
      {!mounted ? (
        <SunIcon className="h-4 w-4 opacity-50" />
      ) : isDark ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </button>
  )
}
