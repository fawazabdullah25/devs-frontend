import * as React from "react"
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getAdminContentById,
  getMediaVersions,
  restoreMediaVersion,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { formatDuration } from "@/types/content"
import { toast } from "@/components/ui/toast"
import type {
  ContentUnit,
  LearningContent,
  MediaVersion,
} from "@/types/content"

function formatDate(value: string | undefined, locale: "en" | "ar") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function MediaVersionHistory({
  contentId,
  unit,
  open,
  onSaved,
}: {
  contentId: string
  unit: ContentUnit | null
  open: boolean
  onSaved: (content: LearningContent) => void
}) {
  const { locale, t } = useLocale()
  const [versions, setVersions] = React.useState<MediaVersion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [restoringId, setRestoringId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!unit) return
    setLoading(true)
    setError("")
    try {
      setVersions(await getMediaVersions(contentId, unit.id))
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("versionsLoadFailed")
      )
    } finally {
      setLoading(false)
    }
  }, [contentId, t, unit])

  React.useEffect(() => {
    if (open) void load()
  }, [load, open])

  const restore = async (version: MediaVersion) => {
    if (!unit) return
    setRestoringId(version.id)
    setError("")
    try {
      await restoreMediaVersion(contentId, unit.id, version.id)
      const saved = await getAdminContentById(contentId)
      if (!saved) throw new Error("Content not found after media restoration")
      onSaved(saved)
      await load()
      toast.add({ title: t("versionRestored"), type: "success" })
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t("versionRestoreFailed")
      setError(message)
      toast.add({
        title: t("versionRestoreFailed"),
        description: message,
        type: "error",
      })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("mediaVersions")}</CardTitle>
        <CardDescription>{t("mediaVersionsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : versions.length ? (
          versions.map((version, index) => {
            const current = version.current || version.id === unit?.media.id
            return (
              <React.Fragment key={version.id || version.mediaId || index}>
                {index > 0 && <Separator />}
                <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {current && (
                        <CheckCircleIcon
                          className="text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <Badge variant={current ? "default" : "outline"}>
                        {current ? t("currentVersion") : t("retainedVersion")}
                      </Badge>
                      <span className="text-sm font-medium">
                        {version.provider} ·{" "}
                        {formatDuration(version.durationSeconds)}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                      <div>
                        <dt className="inline font-medium text-foreground">
                          {t("technicalPath")}:{" "}
                        </dt>
                        <dd className="inline font-mono break-all">
                          {version.technicalPath || version.playbackPath || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-foreground">
                          {t("encoding")}:{" "}
                        </dt>
                        <dd className="inline">
                          {version.encodingVersion || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-foreground">
                          {t("updated")}:{" "}
                        </dt>
                        <dd className="inline">
                          {formatDate(
                            version.updatedAt ?? version.createdAt,
                            locale
                          )}
                        </dd>
                      </div>
                      {!current && version.purgeAfter && (
                        <div>
                          <dt className="inline font-medium text-foreground">
                            {t("restoreDeadline")}:{" "}
                          </dt>
                          <dd className="inline">
                            {formatDate(version.purgeAfter, locale)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  {!current && version.status === "READY" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoringId !== null}
                      onClick={() => void restore(version)}
                    >
                      <ArrowCounterClockwiseIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {restoringId === version.id
                        ? t("loading")
                        : t("restoreVersion")}
                    </Button>
                  )}
                </div>
              </React.Fragment>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("noMediaVersions")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
