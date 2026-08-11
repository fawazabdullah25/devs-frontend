import {
  ArrowRightIcon,
  BookOpenIcon,
  GraduationCapIcon,
  PlayIcon,
} from "@phosphor-icons/react"
import { Link, createFileRoute } from "@tanstack/react-router"

import { ContentCard } from "@/components/content-card"
import { DevsLogo } from "@/components/devs-logo"
import { FeaturedRail } from "@/components/featured-rail"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getHome } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/$locale/")({
  loader: () => getHome(),
  component: HomePage,
})

function HomePage() {
  const home = Route.useLoaderData()
  const { locale, t } = useLocale()

  return (
    <>
      <section className="brand-glow brand-grid relative isolate overflow-hidden border-b">
        <div className="content-shell grid min-h-[620px] items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="flex max-w-3xl flex-col items-start gap-7">
            <div
              className={cn("flex flex-col gap-5", locale === "ar" && "gap-7")}
            >
              <h1
                className={cn(
                  "text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl",
                  locale === "ar" ? "leading-[1.22]" : "leading-[1.04]"
                )}
              >
                {t("heroTitleStart")}{" "}
                <span className="text-primary">{t("heroTitleAccent")}</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {t("heroDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                render={<Link to="/$locale/catalog" params={{ locale }} />}
                nativeButton={false}
              >
                <PlayIcon data-icon="inline-start" />
                {t("browse")}
              </Button>
            </div>
          </div>

          <div
            className="relative hidden min-h-[430px] lg:block"
            aria-hidden="true"
          >
            <div className="absolute inset-8 rotate-6 border bg-card/55 shadow-2xl backdrop-blur-sm" />
            <div className="absolute inset-8 -rotate-3 border bg-secondary/70" />
            <div className="absolute inset-16 grid place-items-center border bg-card shadow-xl">
              <DevsLogo compact className="scale-[4]" />
            </div>
          </div>
        </div>
      </section>

      <section className="content-shell relative z-10 -mt-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={BookOpenIcon}
            value={home.counts.courses}
            label={t("courses")}
          />
          <StatCard
            icon={GraduationCapIcon}
            value={home.counts.series}
            label={t("series")}
          />
          <StatCard
            icon={PlayIcon}
            value={home.counts.lessons}
            label={t("lessons")}
          />
        </div>
      </section>

      {home.featured.length >= 4 && (
        <section className="content-shell py-24">
          <SectionHeading
            title={t("featured")}
            description={t("featuredDescription")}
          />
          <FeaturedRail items={home.featured} />
        </section>
      )}

      <Separator />
      <section className="content-shell py-24">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading
              title={t("latest")}
              description={t("latestDescription")}
            />
            <Button
              variant="outline"
              render={<Link to="/$locale/catalog" params={{ locale }} />}
              nativeButton={false}
            >
              {t("allContent")}
              <ArrowRightIcon
                data-icon="inline-end"
                className="rtl:rotate-180"
              />
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {home.latest.slice(0, 6).map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-8 flex max-w-2xl flex-col gap-3">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="leading-7 text-muted-foreground">{description}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpenIcon
  value: number
  label: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
