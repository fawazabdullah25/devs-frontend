import { afterEach, describe, expect, it } from "vitest"

import {
  deleteContent,
  getAdminContentById,
  getDeletedAdminContent,
  normalizeMediaVersion,
  restoreContent,
} from "@/lib/api"

describe("mock admin lifecycle API", () => {
  const contentId = "content-sql"

  afterEach(async () => {
    const deleted = await getDeletedAdminContent()
    if (deleted.some((item) => item.id === contentId))
      await restoreContent(contentId)
  })

  it("moves content to the retention trash and restores it", async () => {
    expect(await getAdminContentById(contentId)).not.toBeNull()

    await deleteContent(contentId)

    expect(await getAdminContentById(contentId)).not.toBeNull()
    expect(
      (await getDeletedAdminContent()).some((item) => item.id === contentId)
    ).toBe(true)

    await restoreContent(contentId)

    expect(
      (await getDeletedAdminContent()).some((item) => item.id === contentId)
    ).toBe(false)
    expect((await getAdminContentById(contentId))?.status).toBe("DRAFT")
  })

  it("normalizes backend mediaId values for version consumers", () => {
    const version = normalizeMediaVersion({
      mediaId: "media-retained",
      current: false,
      status: "READY",
      durationSeconds: 120,
      captions: [],
      playbackPath: "pilots/example/master.m3u8",
    })

    expect(version.id).toBe("media-retained")
    expect(version.mediaId).toBe("media-retained")
    expect(version.current).toBe(false)
  })
})
