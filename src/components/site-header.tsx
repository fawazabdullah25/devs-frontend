import * as React from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { ListIcon } from "@phosphor-icons/react"

import { DevsLogo } from "@/components/devs-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/locale-context"

export function SiteHeader() {
  const { locale, t } = useLocale()
  const alternateLocale = locale === "en" ? "ar" : "en"
  const location = useRouterState({ select: (state) => state.location })
  const [hasHydrated, setHasHydrated] = React.useState(false)

  React.useEffect(() => {
    setHasHydrated(true)
  }, [])

  // URL fragments never reach the server. Add the client-only fragment after
  // hydration so the initial href matches, and prefix TanStack's bare hash.
  const hash = hasHydrated && location.hash ? `#${location.hash}` : ""
  const alternateHref = `${withLocale(location.pathname, alternateLocale)}${location.searchStr}${hash}`
  const navigation = [{ label: t("catalog"), to: "/$locale/catalog" as const }]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75">
      <div className="content-shell flex h-16 items-center justify-between gap-4">
        <Link to="/$locale" params={{ locale }} aria-label="KStack Devs home">
          <DevsLogo />
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              render={<Link to={item.to} params={{ locale }} />}
              nativeButton={false}
            >
              {item.label}
            </Button>
          ))}
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Button
            variant="ghost"
            render={<a href={alternateHref} />}
            nativeButton={false}
          >
            {t("switchLanguage")}
          </Button>
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <ListIcon />
              <span className="sr-only">{t("openMenu")}</span>
            </SheetTrigger>
            <SheetContent side={locale === "ar" ? "left" : "right"}>
              <SheetHeader>
                <SheetTitle>
                  <DevsLogo />
                </SheetTitle>
                <SheetDescription>{t("builtByStudents")}</SheetDescription>
              </SheetHeader>
              <nav
                className="flex flex-col gap-2 p-4"
                aria-label="Mobile navigation"
              >
                {navigation.map((item) => (
                  <Button
                    key={item.to}
                    variant="ghost"
                    className="justify-start"
                    render={<Link to={item.to} params={{ locale }} />}
                    nativeButton={false}
                  >
                    {item.label}
                  </Button>
                ))}
                <Separator />
                <Button
                  variant="outline"
                  render={<a href={alternateHref} />}
                  nativeButton={false}
                >
                  {t("switchLanguage")}
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export function withLocale(pathname: string, locale: "en" | "ar") {
  const localized = pathname.replace(/^\/(?:en|ar)(?=\/|$)/, `/${locale}`)
  return localized === pathname ? `/${locale}${pathname}` : localized
}
