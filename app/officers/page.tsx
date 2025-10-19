"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OfficersPanel } from "@/components/officers/officers-panel"
import { SignalControlPanel } from "@/components/officers/signal-control-panel"
import { DispatchCenter } from "@/components/officers/dispatch-center"
import { useState } from "react"

export default function OfficersPage() {
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null)

  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col overflow-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Officer & Signal Control</h1>
          <p className="text-muted-foreground mt-1">Manage field officers and traffic signal operations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-auto">
          <div className="lg:col-span-2 space-y-4 overflow-auto">
            <OfficersPanel selectedOfficer={selectedOfficer} onSelectOfficer={setSelectedOfficer} />
            <SignalControlPanel />
          </div>
          <div className="overflow-auto">
            <DispatchCenter selectedOfficer={selectedOfficer} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
