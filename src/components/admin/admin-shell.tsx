import * as React from "react"
import {
  BookOpenIcon,
  ChartBarIcon,
  FilmStripIcon,
  GearIcon,
  ListIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useLocale } from "@/lib/locale-context"
import type { AdminSection } from "./admin-types"

const navigation = [
  { value: "overview", icon: ChartBarIcon, label: "overview" },
  { value: "content", icon: BookOpenIcon, label: "content" },
  { value: "media", icon: FilmStripIcon, label: "media" },
  { value: "team", icon: UsersThreeIcon, label: "team" },
  { value: "settings", icon: GearIcon, label: "settings" },
] as const

export function AdminShell({
  section,
  onSectionChange,
  children,
  heading,
  description,
  action,
}: {
  section: AdminSection
  onSectionChange: (section: AdminSection) => void
  children: React.ReactNode
  heading: string
  description: string
  action?: React.ReactNode
}) {
  const { locale, t } = useLocale()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const items = navigation.map((item) => ({
    ...item,
    label: t(item.label),
  }))

  const choose = (value: AdminSection) => {
    onSectionChange(value)
    setMobileOpen(false)
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label={t("adminMenu")}>
      {items.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          type="button"
          variant={section === value ? "secondary" : "ghost"}
          className="justify-start"
          aria-current={section === value ? "page" : undefined}
          onClick={() => choose(value)}
        >
          <Icon data-icon="inline-start" aria-hidden="true" />
          {label}
        </Button>
      ))}
    </nav>
  )

  return (
    <div className="content-shell py-8 sm:py-12">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={<Button variant="outline" className="mb-5 lg:hidden" />}
        >
          <ListIcon data-icon="inline-start" aria-hidden="true" />
          {t("adminMenu")}
        </SheetTrigger>
        <SheetContent side={locale === "ar" ? "right" : "left"}>
          <SheetHeader>
            <SheetTitle>{t("adminMenu")}</SheetTitle>
            <SheetDescription>{t("adminDescription")}</SheetDescription>
          </SheetHeader>
          <div className="px-4">{nav}</div>
        </SheetContent>
      </Sheet>

      <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="border bg-card p-3">{nav}</div>
        </aside>

        <main className="min-w-0">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-3xl flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {heading}
              </h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
            {action}
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
