import {
  ArrowUpRightIcon,
  ClockIcon,
  GlobeHemisphereWestIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

import { BrandCover } from "@/components/brand-cover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { formatDuration, getContentDuration, localize } from "@/types/content"
import type { LearningContent } from "@/types/content"

export function ContentCard({ content }: { content: LearningContent }) {
  const { locale, t } = useLocale()
  const href =
    content.kind === "COURSE"
      ? "/$locale/courses/$slug"
      : "/$locale/series/$slug"
  const title = localize(content.title, locale)
  const coverLabel = `${
    content.kind === "COURSE" ? t("viewCourse") : t("viewSeries")
  }: ${title}`
  const spokenLanguage =
    content.spokenLanguage === "AR"
      ? t("arabic")
      : content.spokenLanguage === "EN"
        ? t("english")
        : t("mixed")

  return (
    <Card className="group h-full overflow-hidden pt-0 transition-transform hover:-translate-y-1">
      <Link
        to={href}
        params={{ locale, slug: content.slug }}
        aria-label={coverLabel}
        className="block focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        {content.coverUrl ? (
          <img
            src={content.coverUrl}
            alt=""
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
        ) : (
          <BrandCover seed={content.slug} title={title} />
        )}
      </Link>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{content.kind === "COURSE" ? t("course") : t("series")}</Badge>
          <Badge variant="outline">
            {localize(content.level.name, locale)}
          </Badge>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="line-clamp-2 leading-relaxed">
          {localize(content.summary, locale)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon aria-hidden="true" />
          {formatDuration(getContentDuration(content))}
        </span>
        {content.kind === "SERIES" && (
          <span className="inline-flex items-center gap-1.5">
            <ListBulletsIcon aria-hidden="true" />
            {content.units.length} {t("lessons")}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <GlobeHemisphereWestIcon aria-hidden="true" />
          {spokenLanguage}
        </span>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            {content.instructors[0]?.avatarUrl && (
              <AvatarImage src={content.instructors[0].avatarUrl} alt="" />
            )}
            <AvatarFallback>
              {content.instructors[0]?.initials ?? "KS"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">
            {content.instructors[0]
              ? localize(content.instructors[0].name, locale)
              : "KStack"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={href} params={{ locale, slug: content.slug }} />}
          nativeButton={false}
        >
          {content.kind === "COURSE" ? t("viewCourse") : t("viewSeries")}
          <ArrowUpRightIcon
            data-icon="inline-end"
            className="rtl:-scale-x-100"
          />
        </Button>
      </CardFooter>
    </Card>
  )
}
