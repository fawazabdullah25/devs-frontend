import * as React from "react"
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  CheckIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocale } from "@/lib/locale-context"
import { uploadCaptionFile } from "@/lib/api"
import { useRouter } from "@tanstack/react-router"
import { CurriculumEditor } from "@/components/curriculum-editor"
import { ContentDetailsForm } from "./content-details-form"
import { ContentPublishing } from "./content-publishing"
import { LessonManagement } from "./lesson-management"
import type { LearningContent, ReferenceData } from "@/types/content"

export type WorkspaceTab = "details" | "curriculum" | "publishing"

export function ContentWorkspace({
  initialContent,
  initialReferenceData,
  tab,
  selectedLessonId,
  onTabChange,
  onDeleted,
}: {
  initialContent: LearningContent
  initialReferenceData: ReferenceData
  tab: WorkspaceTab
  selectedLessonId?: string
  onTabChange: (tab: WorkspaceTab) => void
  onDeleted: () => void
}) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const [content, setContent] = React.useState(initialContent)
  const [referenceData, setReferenceData] = React.useState(initialReferenceData)

  React.useEffect(() => setContent(initialContent), [initialContent])
  React.useEffect(
    () => setReferenceData(initialReferenceData),
    [initialReferenceData]
  )

  const changed = (next: LearningContent) => {
    setContent(next)
    void router.invalidate({ sync: true }).catch(() => undefined)
  }
  const previewPath = `/${locale}/${content.kind === "COURSE" ? "courses" : "series"}/${content.slug}`
  const previewDescriptionId = `content-preview-description-${content.id}`
  const detailsFormId = `content-details-form-${content.id}`

  return (
    <div className="content-shell py-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            render={<a href={`/${locale}/admin?section=content`} />}
            nativeButton={false}
          >
            <ArrowLeftIcon
              data-icon="inline-start"
              className="rtl:rotate-180"
              aria-hidden="true"
            />
            {t("contentLibrary")}
          </Button>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {content.kind === "COURSE" ? t("course") : t("series")}
              </Badge>
              <Badge
                variant={
                  content.status === "PUBLISHED" ? "default" : "secondary"
                }
              >
                {content.status === "PUBLISHED"
                  ? t("published")
                  : content.status === "DRAFT"
                    ? t("drafts")
                    : t("archived")}
              </Badge>
            </div>
            <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">
              {content.title[locale] || content.title.en}
            </h1>
            <p className="text-muted-foreground">{content.slug}</p>
          </div>
        </div>
        {content.status === "PUBLISHED" ? (
          <Button
            render={<a href={previewPath} target="_blank" rel="noreferrer" />}
            nativeButton={false}
            variant="outline"
          >
            <ArrowSquareOutIcon data-icon="inline-start" aria-hidden="true" />
            {t("preview")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled
              aria-describedby={previewDescriptionId}
              title={t("previewUnavailable")}
            >
              <ArrowSquareOutIcon data-icon="inline-start" aria-hidden="true" />
              {t("preview")}
            </Button>
            <span id={previewDescriptionId} className="sr-only">
              {t("previewUnavailable")}
            </span>
          </>
        )}
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as WorkspaceTab)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList
            variant="line"
            className="grid w-full grid-cols-3 overflow-hidden sm:w-fit"
          >
            <TabsTrigger value="details">{t("details")}</TabsTrigger>
            <TabsTrigger value="curriculum">{t("curriculum")}</TabsTrigger>
            <TabsTrigger value="publishing">{t("publishing")}</TabsTrigger>
          </TabsList>
          {tab === "details" && (
            <Button type="submit" form={detailsFormId}>
              {t("saveMetadata")}
              <CheckIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          )}
        </div>
        <TabsContent value="details" className="mt-6">
          <ContentDetailsForm
            content={content}
            referenceData={referenceData}
            onSaved={changed}
            onReferenceDataChanged={setReferenceData}
            formId={detailsFormId}
          />
        </TabsContent>
        <TabsContent value="curriculum" className="mt-6 flex flex-col gap-6">
          <LessonManagement
            content={content}
            selectedLessonId={selectedLessonId}
            onChanged={changed}
            onCaptionUpload={uploadCaptionFile}
          />
          {content.kind === "SERIES" && (
            <CurriculumEditor initial={content} embedded onSaved={changed} />
          )}
        </TabsContent>
        <TabsContent value="publishing" className="mt-6">
          <ContentPublishing
            content={content}
            onSaved={changed}
            onDeleted={onDeleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
