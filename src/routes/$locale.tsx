import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { isLocale } from "@/lib/i18n"
import { LocaleProvider } from "@/lib/locale-context"

export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) {
      throw redirect({ to: "/$locale", params: { locale: "en" } })
    }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale: rawLocale } = Route.useParams()
  const locale = isLocale(rawLocale) ? rawLocale : "en"

  return (
    <LocaleProvider locale={locale}>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  )
}
