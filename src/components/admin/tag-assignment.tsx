import * as React from "react"
import { CaretDownIcon, XIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"
import type { Tag, TagGroup } from "@/types/content"

const groups: TagGroup[] = ["TOPIC", "DIFFICULTY", "GENERAL"]

export function TagAssignment({
  tags,
  selectedSlugs,
  onSelectedChange,
}: {
  tags: Tag[]
  selectedSlugs: string[]
  onSelectedChange: (slugs: string[]) => void
}) {
  const { locale, t } = useLocale()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected = tags.filter((tag) => selectedSlugs.includes(tag.slug))
  const filtered = tags.filter((tag) => {
    const needle = query.trim().toLowerCase()
    return (
      !needle ||
      [tag.slug, tag.name.en, tag.name.ar]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    )
  })

  const toggle = (tag: Tag) => {
    if (selectedSlugs.includes(tag.slug)) {
      onSelectedChange(selectedSlugs.filter((slug) => slug !== tag.slug))
      return
    }
    const withoutDifficulty =
      tag.group === "DIFFICULTY"
        ? selectedSlugs.filter(
            (slug) =>
              !tags.some(
                (candidate) =>
                  candidate.slug === slug && candidate.group === "DIFFICULTY"
              )
          )
        : selectedSlugs
    onSelectedChange([...withoutDifficulty, tag.slug])
  }

  return (
    <Field>
      <FieldLabel>{t("tags")}</FieldLabel>
      <FieldDescription>{t("tagsHint")}</FieldDescription>
      <div className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <Badge key={tag.slug} variant="secondary" className="gap-1 pe-1">
            {localize(tag.name, locale)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              aria-label={`${t("removeTag")}: ${localize(tag.name, locale)}`}
              onClick={() => toggle(tag)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </Badge>
        ))}
      </div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
            />
          }
        >
          {selected.length ? t("editTags") : t("selectTags")}
          <CaretDownIcon data-icon="inline-end" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-96 w-(--anchor-width) min-w-64 p-1"
        >
          <Input
            value={query}
            placeholder={t("searchTags")}
            aria-label={t("searchTags")}
            className="mb-1"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
          {groups.map((group) => {
            const values = filtered.filter((tag) => tag.group === group)
            if (!values.length) return null
            return (
              <DropdownMenuGroup key={group}>
                <DropdownMenuLabel>{groupLabel(group, t)}</DropdownMenuLabel>
                {values.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedSlugs.includes(tag.slug)}
                    onCheckedChange={() => toggle(tag)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {localize(tag.name, locale)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            )
          })}
          {!filtered.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {t("noTagsFound")}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}

function groupLabel(group: TagGroup, t: ReturnType<typeof useLocale>["t"]) {
  if (group === "TOPIC") return t("topicTags")
  if (group === "DIFFICULTY") return t("difficultyTags")
  return t("generalTags")
}
