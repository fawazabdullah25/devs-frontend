import {
  BookOpenIcon,
  EyeIcon,
  FilmStripIcon,
  NotePencilIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import type { AdminSnapshot } from "./admin-types"

export function AdminOverview({
  summary,
}: {
  summary: AdminSnapshot["summary"]
}) {
  const { locale, t } = useLocale()
  const metrics = [
    { icon: BookOpenIcon, label: t("published"), value: summary.published },
    { icon: NotePencilIcon, label: t("drafts"), value: summary.drafts },
    {
      icon: FilmStripIcon,
      label: t("processing"),
      value: summary.processingMedia,
    },
    {
      icon: EyeIcon,
      label: t("views"),
      value: summary.views.toLocaleString(locale),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardDescription>{label}</CardDescription>
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Alert className="py-3">
        <ShieldCheckIcon aria-hidden="true" />
        <AlertTitle>{t("accessReady")}</AlertTitle>
        <AlertDescription>{t("accessReadyDescription")}</AlertDescription>
      </Alert>
    </div>
  )
}
