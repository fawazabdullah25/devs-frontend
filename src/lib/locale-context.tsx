import * as React from "react"

import { createTranslator } from "@/lib/i18n"
import type { MessageKey } from "@/lib/i18n"
import type { Locale } from "@/types/content"

interface LocaleContextValue {
  locale: Locale
  direction: "ltr" | "rtl"
  t: (key: MessageKey) => string
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  React.useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.cookie = `DEVS_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`
  }, [locale])

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      t: createTranslator(locale),
    }),
    [locale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const value = React.useContext(LocaleContext)
  if (!value) throw new Error("useLocale must be used inside LocaleProvider")
  return value
}
