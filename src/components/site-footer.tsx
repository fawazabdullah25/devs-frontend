import { GithubLogoIcon, XLogoIcon } from "@phosphor-icons/react"

import { DevsLogo } from "@/components/devs-logo"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/locale-context"

export function SiteFooter() {
  const { t } = useLocale()

  return (
    <footer className="mt-20 bg-card">
      <Separator />
      <div className="content-shell flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-xl flex-col gap-4">
          <DevsLogo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("footerDescription")}
          </p>
        </div>
        <nav className="flex gap-2" aria-label="Social links">
          <Button
            variant="outline"
            render={
              <a
                href="https://github.com/KAUStack"
                target="_blank"
                rel="noreferrer"
              />
            }
            nativeButton={false}
          >
            <GithubLogoIcon data-icon="inline-start" />
            GitHub
          </Button>
          <Button
            variant="outline"
            render={
              <a
                href="https://x.com/KauIndex"
                target="_blank"
                rel="noreferrer"
              />
            }
            nativeButton={false}
          >
            <XLogoIcon data-icon="inline-start" />
            Twitter
          </Button>
        </nav>
      </div>
    </footer>
  )
}
