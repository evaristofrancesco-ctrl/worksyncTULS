
"use client"

import { Calendar, Clock, FileText, Gift, Info, Loader2 } from "lucide-react"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useMemo, useState, useEffect } from "react"

export default function EmployeeDashboard() {
  const { user } = useUser()
  const db = useFirestore()
  const [employeeId, setEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  // Recupera i turni del dipendente
  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return collection(db, "employees", employeeId, "shifts");
  }, [db, employeeId])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  // Recupera le ultime timbrature
  const entriesQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "timeentries"),
      orderBy("checkInTime", "desc"),
      limit(3)
    );
  }, [db, employeeId])
  const { data: recentEntries, isLoading: isEntriesLoading } = useCollection(entriesQuery)

  // Trova il turno di oggi
  const todayShift = useMemo(() => {
    if (!shifts) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return shifts.find(s => s.date === todayStr);
  }, [shifts]);

  // Calcolo ore settimanali (mock per ora, basato su entries)
  const weeklyHours = useMemo(() => {
    if (!recentEntries) return 0;
    // Somma molto semplificata per il prototipo
    return recentEntries.length * 4; 
  }, [recentEntries]);

  const goalHours = 40; // Standard TU.L.S. aggiornato a 40h
  const progress = Math.min(100, (weeklyHours / goalHours) * 100);

  return (
    <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in duration-700">
      <div className="lg:col-span-8 space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Dashboard Personale</h1>
          <p className="text-muted-foreground">Bentornato, {(user?.displayName || "Collaboratore").split(' ')[0]}. Ecco il tuo programma.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-[#227FD8]/20 bg-[#227FD8]/5 overflow-hidden group shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#227FD8] font-black uppercase tracking-wider text-[10px]">Turno di Oggi</CardDescription>
              <CardTitle className="text-2xl font-black text-[#1e293b]">
                {isShiftsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : todayShift ? todayShift.title : "Nessun Turno"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayShift ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-[#227FD8]" />
                    <span className="font-bold text-[#1e293b]">
                      {new Date(todayShift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(todayShift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-[#227FD8] text-white font-bold">Punto Vendita</Badge>
                    <Badge variant="outline" className="font-bold border-[#227FD8]/20 text-[#227FD8]">Sede Centrale</Badge>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Non hai turni pianificati per la giornata odierna.</p>
              )}
              <Button className="w-full mt-6 bg-[#227FD8] hover:bg-[#227FD8]/90 font-black shadow-md">Vedi Programma</Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-600 font-black uppercase tracking-wider text-[10px]">Progressi Settimanali</CardDescription>
              <CardTitle className="text-2xl font-black text-[#1e293b]">{weeklyHours} Ore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Obiettivo ({goalHours}h)</span>
                  <span className="font-black text-[#1e293b]">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-muted rounded-full" />
              </div>
              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Info className="h-3 w-3 text-amber-500" />
                  Statistiche basate sulle ultime attività registrate.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-black text-xl">Attività Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {isEntriesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
              ) : recentEntries && recentEntries.length > 0 ? recentEntries.map((act) => (
                <div key={act.id} className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!act.checkOutTime ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1e293b]">{!act.checkOutTime ? 'Entrata in corso' : 'Turno completato'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(act.checkInTime).toLocaleDateString('it-IT')} alle {new Date(act.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-bold text-[10px]">
                    {act.type === "AUTO" ? "AUTOMATICO" : "MANUALE"}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-center text-muted-foreground py-10 italic">Nessuna attività registrata recentemente.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <ClockInOut />

        <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black">Saldo Permessi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <p className="text-2xl font-black text-[#1e293b]">12</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase">Giorni Ferie</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <p className="text-2xl font-black text-[#1e293b]">5</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase">Malattia</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2 font-bold border-[#227FD8] text-[#227FD8] hover:bg-[#227FD8]/5">
              <Gift className="h-4 w-4" />
              Richiedi Ferie
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#227FD8] text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-black uppercase tracking-tighter">Comunicazioni</h4>
            </div>
            <p className="text-sm text-white/90 leading-relaxed mb-4 font-medium">
              Controlla regolarmente la bacheca per aggiornamenti sugli orari del punto vendita durante le festività.
            </p>
            <Button variant="secondary" size="sm" className="w-full font-black text-[#227FD8]">LEGGI TUTTO</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
