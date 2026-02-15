"use client"

import { CheckCircle2, XCircle, Clock, Filter, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const requests = [
  { 
    id: 1, 
    name: "Michael Chen", 
    type: "Ferie", 
    dates: "01 Mag - 05 Mag", 
    reason: "Viaggio di famiglia in Italia", 
    status: "In Attesa",
    submittedAt: "2 ore fa"
  },
  { 
    id: 2, 
    name: "Elena Rodriguez", 
    type: "Malattia", 
    dates: "24 Apr", 
    reason: "Certificato medico inviato", 
    status: "Approvato",
    submittedAt: "Ieri"
  },
  { 
    id: 3, 
    name: "David Kim", 
    type: "Permesso", 
    dates: "25 Apr (Pomeriggio)", 
    reason: "Visita dentistica", 
    status: "In Attesa",
    submittedAt: "Ieri alle 18:00"
  },
]

export default function RequestsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Richieste Dipendenti</h1>
        <p className="text-muted-foreground">Gestisci ferie, permessi e malattie del tuo team.</p>
      </div>

      <div className="grid gap-6">
        {requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className={`w-2 ${request.status === "In Attesa" ? "bg-amber-400" : "bg-green-500"}`} />
              <div className="flex-1 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://picsum.photos/seed/${request.name}/100/100`} />
                      <AvatarFallback>{request.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{request.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" /> Inviata {request.submittedAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-muted font-bold">
                      {request.type}
                    </Badge>
                    <Badge variant={request.status === "In Attesa" ? "secondary" : "default"}>
                      {request.status}
                    </Badge>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Periodo Richiesto</p>
                      <p className="font-medium">{request.dates}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Motivazione</p>
                      <p className="text-sm italic">"{request.reason}"</p>
                    </div>
                  </div>
                </div>

                {request.status === "In Attesa" && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageSquare className="h-4 w-4" /> Rispondi
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
                      <XCircle className="h-4 w-4" /> Rifiuta
                    </Button>
                    <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4" /> Approva
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
