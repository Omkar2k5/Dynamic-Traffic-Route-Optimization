"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { mockOfficers, mockIncidents } from "@/lib/mock-data"
import { Send } from "lucide-react"
import { useState } from "react"

interface DispatchCenterProps {
  selectedOfficer: string | null
}

export function DispatchCenter({ selectedOfficer }: DispatchCenterProps) {
  const [dispatchData, setDispatchData] = useState({
    priority: "high",
    message: "",
    incidentId: "",
  })

  const officer = mockOfficers.find((o) => o.id === selectedOfficer)

  const handleDispatch = () => {
    // Handle dispatch logic
    setDispatchData({ priority: "high", message: "", incidentId: "" })
  }

  return (
    <div className="space-y-3">
      <Card className="border-glow-cyan">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Officer Status</CardTitle>
        </CardHeader>
        <CardContent>
          {officer ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Officer</p>
                <p className="font-semibold text-foreground">{officer.name}</p>
                <p className="text-xs text-muted-foreground">Badge: {officer.badge}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                <Badge
                  variant={
                    officer.status === "available"
                      ? "outline"
                      : officer.status === "responding"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {officer.status}
                </Badge>
              </div>

              {officer.assignedIncidents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Assigned Incidents</p>
                  <div className="space-y-1">
                    {officer.assignedIncidents.map((incidentId) => {
                      const incident = mockIncidents.find((i) => i.id === incidentId)
                      return (
                        <div key={incidentId} className="p-2 rounded bg-red-500/10 border border-red-500/30">
                          <p className="text-xs font-medium text-foreground">{incident?.title}</p>
                          <p className="text-xs text-muted-foreground">{incident?.location.address}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Select an officer to view details</p>
          )}
        </CardContent>
      </Card>

      {officer && (
        <Card className="border-glow-cyan">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Send Dispatch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Priority Level</Label>
              <RadioGroup
                value={dispatchData.priority}
                onValueChange={(value) => setDispatchData({ ...dispatchData, priority: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="text-xs font-normal cursor-pointer">
                    Low
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="text-xs font-normal cursor-pointer">
                    High
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical" id="critical" />
                  <Label htmlFor="critical" className="text-xs font-normal cursor-pointer">
                    Critical
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident" className="text-xs">
                Assign Incident
              </Label>
              <Select
                value={dispatchData.incidentId}
                onValueChange={(value) => setDispatchData({ ...dispatchData, incidentId: value })}
              >
                <SelectTrigger id="incident" className="h-8 text-xs">
                  <SelectValue placeholder="Select incident..." />
                </SelectTrigger>
                <SelectContent>
                  {mockIncidents.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      {incident.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-xs">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Enter dispatch message..."
                value={dispatchData.message}
                onChange={(e) => setDispatchData({ ...dispatchData, message: e.target.value })}
                className="text-xs h-20 resize-none"
              />
            </div>

            <Button className="w-full gap-2 h-8 text-xs" onClick={handleDispatch}>
              <Send className="w-3 h-3" />
              Send Dispatch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
