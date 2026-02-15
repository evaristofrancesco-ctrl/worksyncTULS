"use client"

import { Calendar, Clock, MapPin, ChevronRight, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function MyShiftsPage() {
  const shifts = [
    { id: 1, title: "Sprint di Sviluppo", date: "Oggi", time: "09:00 - 17:00", location: "Sede Centrale", status: "In Corso" },
    { id: 2, title: "Revisione Progetto", date: "Domani", time: "10:00 - 14:00", location: "Remoto", status: "Programmato" },
    { id: 3, title: "Sprint di Sviluppo", date: "Ven, 26 Apr", time: "09:00 - 17:00", location: "Sede Centrale", status: "Programmato" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">I Miei Turni</h1>
        <p className="text-muted-foreground">Controlla il tuo programma di lavoro per le prossime settimane.</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Aggiornamento Orari</AlertTitle>
        <AlertDescription className="text-blue-700">
          I turni per la prossima settimana sono stati confermati. Si prega di prenderne visione.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {shifts.map((shift) => (
          <Card key={shift.id} className={`group hover:shadow-md transition-shadow cursor-pointer ${shift.status === "In Corso" ? "border-accent/40 bg-accent/5" : ""}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg ${shift.status === "In Corso" ? "bg-accent text-white" : "bg-muted text-muted-foreground"}`}>
                  {shift.date === "Oggi" ? "OG" : shift.date.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-none mb-1">{shift.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {shift.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {shift.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {shift.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={shift.status === "In Corso" ? "default" : "secondary"}>
                  {shift.status}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="w-full h-12 border-dashed font-semibold">
        Sincronizza con Calendario Google/Apple
      </Button>
    </div>
  )
}
