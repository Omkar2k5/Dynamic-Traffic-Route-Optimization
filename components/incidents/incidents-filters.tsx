"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

interface IncidentsFiltersProps {
  filters: {
    severity: string
    status: string
    search: string
  }
  onFiltersChange: (filters: any) => void
}

export function IncidentsFilters({ filters, onFiltersChange }: IncidentsFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleSeverityChange = (value: string) => {
    onFiltersChange({ ...filters, severity: value })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value })
  }

  const handleReset = () => {
    onFiltersChange({
      severity: "all",
      status: "all",
      search: "",
    })
  }

  return (
    <Card className="border-glow-cyan">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Severity</label>
            <Select value={filters.severity} onValueChange={handleSeverityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={handleReset} title="Reset filters">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
