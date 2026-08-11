import { describe, expect, it } from "vitest"

import { getCatalog, getContent, getHome } from "@/lib/api"

describe("mock API contract", () => {
  it("only returns published learning and exposes a four-item featured rail", async () => {
    const home = await getHome()
    expect(home.featured).toHaveLength(4)
    expect(home.latest.every((content) => content.status === "PUBLISHED")).toBe(
      true
    )
  })

  it("combines catalog filters", async () => {
    const catalog = await getCatalog({
      kind: "COURSE",
      language: "AR",
      query: "git",
    })
    expect(catalog.items.map((content) => content.slug)).toEqual([
      "git-without-fear",
    ])
  })

  it("does not expose drafts through the public content endpoint", async () => {
    await expect(getContent("containers-clearly")).resolves.toBeNull()
  })
})
