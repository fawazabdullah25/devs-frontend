import { createFileRoute, notFound } from "@tanstack/react-router"

import { ContentWorkspace } from "@/components/admin/content-workspace"
import { getAdminContentById, getReferenceData } from "@/lib/api"

type WorkspaceSearch = {
  tab?: "details" | "curriculum" | "publishing"
  lesson?: string
}

export const Route = createFileRoute("/$locale/admin_/content/$contentId")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): WorkspaceSearch => ({
    tab:
      search.tab === "curriculum" || search.tab === "publishing"
        ? search.tab
        : "details",
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
  }),
  loader: async ({ params }) => {
    const [content, referenceData] = await Promise.all([
      getAdminContentById(params.contentId),
      getReferenceData(),
    ])
    if (!content) throw notFound()
    return { content, referenceData }
  },
  component: ContentWorkspacePage,
})

function ContentWorkspacePage() {
  const data = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  return (
    <ContentWorkspace
      initialContent={data.content}
      initialReferenceData={data.referenceData}
      tab={search.tab ?? "details"}
      selectedLessonId={search.lesson}
      onTabChange={(tab) =>
        void navigate({ search: { tab, lesson: search.lesson } })
      }
      onDeleted={() =>
        void navigate({ to: "/$locale/admin", search: { section: "content" } })
      }
    />
  )
}
