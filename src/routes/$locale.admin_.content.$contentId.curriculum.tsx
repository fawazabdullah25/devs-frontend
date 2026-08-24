import { createFileRoute, notFound } from "@tanstack/react-router"

import { CurriculumEditor } from "@/components/curriculum-editor"
import { getAdminContent } from "@/lib/api"

export const Route = createFileRoute(
  "/$locale/admin_/content/$contentId/curriculum"
)({
  ssr: false,
  loader: async ({ params }) => {
    const content = (await getAdminContent()).find(
      (item) => item.id === params.contentId
    )
    if (!content || content.kind !== "SERIES") throw notFound()
    return content
  },
  component: CurriculumEditorPage,
})

function CurriculumEditorPage() {
  return <CurriculumEditor initial={Route.useLoaderData()} />
}
