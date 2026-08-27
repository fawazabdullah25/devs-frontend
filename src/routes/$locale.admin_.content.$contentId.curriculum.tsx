import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/$locale/admin_/content/$contentId/curriculum"
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$locale/admin/content/$contentId",
      params: {
        locale: params.locale,
        contentId: params.contentId,
      },
      search: { tab: "curriculum" },
    })
  },
})
