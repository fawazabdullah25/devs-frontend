import {
  ArrowLeftIcon,
  ClockIcon,
  EyeIcon,
  GlobeHemisphereWestIcon,
  GraduationCapIcon,
  PlayIcon,
} from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { useLocale } from "@/lib/locale-context"
import { formatDuration, getContentDuration, localize } from "@/types/content"
import type { LearningContent } from "@/types/content"

export function ContentDetailHero({
  content,
  actionHref,
}: {
  content: LearningContent
  actionHref: string
}) {
  const { locale, t } = useLocale()
  const spokenLanguage =
    content.spokenLanguage === "AR"
      ? t("arabic")
      : content.spokenLanguage === "EN"
        ? t("english")
        : t("mixed")

  return (
    <section className="brand-grid border-b bg-card/40">
      <div className="content-shell py-12 sm:py-16">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to="/$locale/catalog" params={{ locale }} />}
          nativeButton={false}
        >
          <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
          {t("backToCatalog")}
        </Button>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-end">
          <div className="flex max-w-3xl flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge>
                {content.kind === "COURSE" ? t("course") : t("series")}
              </Badge>
              {content.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {localize(tag.name, locale)}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {localize(content.title, locale)}
            </h1>
            <p className="text-base leading-8 text-muted-foreground sm:text-lg">
              {localize(content.summary, locale)}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ClockIcon />
                {formatDuration(getContentDuration(content))}
              </span>
              {content.kind === "SERIES" && (
                <span className="inline-flex items-center gap-2">
                  <GraduationCapIcon />
                  {content.units.length} {t("lessons")}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <GlobeHemisphereWestIcon />
                {spokenLanguage}
              </span>
              <span className="inline-flex items-center gap-2">
                <EyeIcon />
                {content.views.toLocaleString(locale)}
              </span>
            </div>
          </div>
          <Button
            size="lg"
            render={<Link to={actionHref} />}
            nativeButton={false}
          >
            <PlayIcon data-icon="inline-start" weight="fill" />
            {content.kind === "COURSE"
              ? t("startCourse")
              : t("continueLearning")}
          </Button>
        </div>
      </div>
    </section>
  )
}

export function AboutContent({ content }: { content: LearningContent }) {
  const { locale, t } = useLocale()

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section className="flex flex-col gap-5">
        <h2 className="text-3xl font-bold tracking-tight">{t("about")}</h2>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          {localize(content.description, locale)}
        </p>
        <Separator />
        <div className="flex flex-wrap gap-2">
          {content.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {localize(tag.name, locale)}
            </Badge>
          ))}
        </div>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>{t("instructors")}</CardTitle>
          <CardDescription>{t("builtByStudents")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {content.instructors.map((instructor) => (
            <div key={instructor.id} className="flex gap-3">
              <Avatar>
                {instructor.avatarUrl && (
                  <AvatarImage src={instructor.avatarUrl} alt="" />
                )}
                <AvatarFallback>{instructor.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold">
                  {localize(instructor.name, locale)}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {localize(instructor.bio, locale)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
