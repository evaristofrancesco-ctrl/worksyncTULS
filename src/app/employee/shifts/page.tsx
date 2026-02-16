
"use client"

import { Calendar, Clock, MapPin, ChevronRight, Info, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useState, useEffect, useMemo } from "react"

export default function MyShiftsPage() {
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "shifts"),
      orderBy("startTime", "asc")
    );
  }, [db, employeeId])

  const { data: shifts, isLoading } = useCollection(shiftsQuery)

  const sortedShifts = useMemo(() => {
    if (!shifts) return [];
    const today = new Date().toISOString().split('T')[0];
    return shifts.filter(s => s.date >= today);
  }, [shifts]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">I Miei Turni</h1>
        <p className="text-muted-foreground">Controlla il tuo programma di lavoro per le prossime settimane.</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold">Aggiornamento Orari</AlertTitle>
        <AlertDescription className="text-blue-700">
          I turni vengono generati settimanalmente dall'amministrazione. In caso di dubbi, contatta il tuo responsabile.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedShifts.length > 0 ? (
          sortedShifts.map((shift) => {
            const start = new Date(shift.startTime)
            const end = new Date(shift.endTime)
            const isToday = shift.date === new Date().toISOString().split('T')[0];

            return (
              <Card key={shift.id} className={`group border-none shadow-sm transition-all ${isToday ? "bg-[#227FD8]/5 border-l-4 border-l-[#227FD8]" : "bg-white/80"}`}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${isToday ? "bg-[#227FD8] text-white" : "bg-muted text-muted-foreground"}`}>
                      <span>{start.toLocaleDateString('it-IT', { day: '2-digit' })}</span>
                      <span className="uppercase text-[10px]">{start.toLocaleDateString('it-IT', { month: 'short' })}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-[#1e293b] leading-none mb-2 uppercase tracking-tight">{shift.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="h-3 w-3" /> {start.toLocaleDateString('it-IT', { weekday: 'long' })}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-[#227FD8]">
                          <Clock className="h-3 w-3" /> {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Punto Vendita TU.L.S.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={isToday ? "default" : "secondary"} className={isToday ? "bg-[#227FD8]" : "font-bold"}>
                      {isToday ? "Oggi" : "Programmato"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card className="border-none shadow-sm bg-white/80 py-20 text-center">
            <CardContent>
              <Info className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium italic">Nessun turno programmato per i prossimi giorni.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
