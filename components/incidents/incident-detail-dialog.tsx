"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, MapPin, Clock, User } from "lucide-react"
import type { Incident } from "@/lib/types"

interface IncidentDetailDialogProps {
  incident: Incident
  onClose: () => void
}

export function IncidentDetailDialog({ incident, onClose }: IncidentDetailDialogProps) {
  const [status, setStatus] = useState(incident.status)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-500/10 text-red-500"
      case "investigating":
        return "bg-yellow-500/10 text-yellow-500"
      case "resolved":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {incident.title}
              </DialogTitle>
              <DialogDescription className="mt-2">{incident.description}</DialogDescription>
            </div>
            <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-glow-cyan">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{incident.location.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{incident.createdAt.toLocaleString()}</p>
                </div>
              </div>

              {incident.assignedOfficer && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Officer</p>
                    <p className="text-sm font-medium">Officer ID: {incident.assignedOfficer}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-glow-cyan">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(status)}`}>{status}</span>
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
