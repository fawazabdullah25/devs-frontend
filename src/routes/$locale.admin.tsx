import * as React from "react"
import { UsersThreeIcon } from "@phosphor-icons/react"
import {
  createFileRoute,
  Outlet,
  useMatches,
  useRouter,
} from "@tanstack/react-router"

import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import { AdminOverview } from "@/components/admin/admin-overview"
import { AdminShell } from "@/components/admin/admin-shell"
import { ContentCreateDialog } from "@/components/admin/content-create-dialog"
import { ContentLibrary } from "@/components/admin/content-library"
import { InstructorManager } from "@/components/admin/instructor-manager"
import { MediaLibrary } from "@/components/admin/media-library"
import type {
  AdminSection,
  AdminSnapshot,
} from "@/components/admin/admin-types"
import {
  getAdminContent,
  getAdminSummary,
  getDeletedAdminContent,
  getDeletedMediaLibrary,
  getMediaLibrary,
  getReferenceData,
} from "@/lib/api"
import { useLocale } from "@/lib/locale-context"

export const Route = createFileRoute("/$locale/admin")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AdminSearch =>
    isAdminSection(search.section) ? { section: search.section } : {},
  loader: async (): Promise<
    AdminSnapshot & {
      media: Awaited<ReturnType<typeof getMediaLibrary>>
      deletedMedia: Awaited<ReturnType<typeof getDeletedMediaLibrary>>
    }
  > => {
    const [
      summary,
      content,
      deletedContent,
      referenceData,
      media,
      deletedMedia,
    ] = await Promise.all([
      getAdminSummary(),
      getAdminContent(),
      getDeletedAdminContent(),
      getReferenceData(),
      getMediaLibrary(),
      getDeletedMediaLibrary(),
    ])
    return {
      summary,
      content,
      deletedContent,
      referenceData,
      media,
      deletedMedia,
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const { locale, t } = useLocale()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const snapshot = Route.useLoaderData()
  const { section: requestedSection } = Route.useSearch()
  const section = requestedSection ?? "overview"
  const matches = useMatches()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [referenceData, setReferenceData] = React.useState(
    snapshot.referenceData
  )

  React.useEffect(
    () => setReferenceData(snapshot.referenceData),
    [snapshot.referenceData]
  )

  const refresh = React.useCallback(() => {
    void router.invalidate({ sync: true }).catch((error) => {
      toast.add({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : t("saveFailed"),
        type: "error",
      })
    })
  }, [router, t])

  const chooseSection = (next: AdminSection) => {
    void navigate({ search: next === "overview" ? {} : { section: next } })
  }

  if (
    matches.some(
      (match) =>
        match.routeId === "/$locale/admin_/content/$contentId/curriculum"
    )
  ) {
    return <Outlet />
  }

  const heading = sectionHeading(section, t)
  return (
    <AdminShell
      section={section}
      onSectionChange={chooseSection}
      heading={heading.title}
      description={heading.description}
      action={
        section === "content" ? (
          <ContentCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(created) => {
              refresh()
              void navigate({
                to: "/$locale/admin/content/$contentId",
                params: { locale, contentId: created.id },
                search: {},
              })
            }}
          />
        ) : undefined
      }
    >
      {section === "overview" && <AdminOverview summary={snapshot.summary} />}
      {section === "content" && (
        <ContentLibrary
          content={snapshot.content}
          deletedContent={snapshot.deletedContent}
          locale={locale}
          onCreate={() => setCreateOpen(true)}
          onChanged={refresh}
        />
      )}
      {section === "media" && (
        <MediaLibrary
          active={snapshot.media}
          deleted={snapshot.deletedMedia}
          locale={locale}
          onChanged={refresh}
        />
      )}
      {section === "team" && (
        <ComingSoon
          icon={<UsersThreeIcon />}
          title={t("teamComingSoonTitle")}
          description={t("teamComingSoonDescription")}
        />
      )}
      {section === "settings" && (
        <Card>
          <CardContent className="pt-6">
            <InstructorManager
              instructors={referenceData.instructors}
              selectedIds={[]}
              locale={locale}
              onSelectedChange={() => undefined}
              onChanged={(instructors) => {
                setReferenceData((current) => ({ ...current, instructors }))
                refresh()
              }}
            />
          </CardContent>
        </Card>
      )}
    </AdminShell>
  )
}

function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  const { t } = useLocale()
  return (
    <Card>
      <CardContent>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <p className="text-xs text-muted-foreground">{t("comingSoon")}</p>
        </Empty>
      </CardContent>
    </Card>
  )
}

function isAdminSection(value: unknown): value is AdminSection {
  return (
    value === "overview" ||
    value === "content" ||
    value === "media" ||
    value === "team" ||
    value === "settings"
  )
}

type AdminSearch = { section?: AdminSection }

function sectionHeading(
  section: AdminSection,
  t: ReturnType<typeof useLocale>["t"]
) {
  if (section === "content") {
    return {
      title: t("contentLibrary"),
      description: t("contentLibraryDescription"),
    }
  }
  if (section === "media") {
    return {
      title: t("mediaInboxTitle"),
      description: t("mediaInboxDescription"),
    }
  }
  if (section === "team") {
    return { title: t("team"), description: t("teamComingSoonDescription") }
  }
  if (section === "settings") {
    return {
      title: t("settings"),
      description: t("settingsComingSoonDescription"),
    }
  }
  return { title: t("adminTitle"), description: t("adminDescription") }
}
