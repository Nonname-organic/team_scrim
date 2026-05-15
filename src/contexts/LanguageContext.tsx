'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ja, en } from '@/lib/translations'

type Locale = 'ja' | 'en'

interface LanguageContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const ctx = createContext<LanguageContextType>({
  locale: 'ja',
  setLocale: () => {},
  t: k => k,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ja')

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved === 'ja' || saved === 'en') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }

  const dict = locale === 'en' ? en : ja

  const t = (key: string): string => {
    const parts = key.split('.')
    let val: unknown = dict
    for (const p of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p]
      else return key
    }
    return typeof val === 'string' ? val : key
  }

  return <ctx.Provider value={{ locale, setLocale, t }}>{children}</ctx.Provider>
}

export const useLanguage = () => useContext(ctx)
