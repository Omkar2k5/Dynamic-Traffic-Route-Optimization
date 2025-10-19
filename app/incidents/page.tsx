"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { IncidentsTable } from "@/components/incidents/incidents-table"
import { IncidentsFilters } from "@/components/incidents/incidents-filters"
import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog"
import { useState } from "react"

export default function IncidentsPage() {
  const [filters, setFilters] = useState({
    severity: "all",
    status: "all",
    search: "",
  })

  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Incidents Management</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage traffic incidents in real-time</p>
          </div>
          <CreateIncidentDialog />
        </div>

        <IncidentsFilters filters={filters} onFiltersChange={setFilters} />

        <div className="flex-1 overflow-auto">
          <IncidentsTable filters={filters} />
        </div>
      </div>
    </DashboardLayout>
  )
}
