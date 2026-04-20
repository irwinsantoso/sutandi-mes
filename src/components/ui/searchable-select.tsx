"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Input } from "./input"
import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
  searchText?: string
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: SearchableSelectOption[]
  className?: string
  disabled?: boolean
  searchPlaceholder?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Select...",
  options,
  className,
  disabled,
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? options.filter((o) => {
        const q = search.toLowerCase()
        return (
          o.label.toLowerCase().includes(q) ||
          (o.searchText ?? "").toLowerCase().includes(q)
        )
      })
    : options

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onValueChange(v)
        setSearch("")
      }}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setSearch("")
      }}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-1 pt-1 pb-1">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-7 text-xs"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            No results found
          </div>
        ) : (
          filtered.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
