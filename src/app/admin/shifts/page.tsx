
"use client"

import { useState, useMemo } from "react"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  Clock,
  User,
  Info,
  Sun,
  Moon,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  parseISO, 
  subDays 
} from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Colori Tailwind per le sedi
const TAILWIND_COLORS = [
  { border: "border-l-[#227FD8]", bg: "bg-blue-50/30", dot: "bg-[#227FD8]" },
  { border: "border-l-emerald-500", bg: "bg-emerald-50/30", dot: "bg-emerald-500" },
  { border: "border-l-amber-500", bg: "bg-amber-50/30", dot: "bg-amber-500" },
  { border: "border-l-purple-500", bg: "bg-purple-50/30", dot: "bg-purple-500" },
  { border: "border-l-rose-500", bg: "bg-rose-50/30", dot: "bg-rose-500" },
  { border: "border-l-indigo-500", bg: "bg-indigo-50/30", dot: "bg-indigo-500" },
  { border: "border-l-cyan-500", bg: "bg-cyan-50/30", dot: "bg-cyan-500" },
]

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calcolo inizio e fine settimana visualizzata (Lunedì-Domenica)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysOfVisualizedWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [weekStart])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "shifts");
  }, [db])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Mappa dinamica colori per sede
  const locationStyles = useMemo(() => {
    const map: Record<string, typeof TAILWIND_COLORS[0]> = {}
    if (!locations) return map
    
    locations.forEach((loc, index) => {
      map[loc.id] = TAILWIND_COLORS[index % TAILWIND_COLORS.length]
    })
    return map
  }, [locations])

  // Filtra i turni per la settimana visualizzata e per l'azienda corretta
  const weekShifts = useMemo(() => {
    if (!shifts) return [];
    const weekEnd = addDays(weekStart, 7);
    return shifts.filter(s => {
      if (s.companyId !== "default") return false;
      try {
        const d = parseISO(s.date);
        return d >= weekStart && d < weekEnd;
      } catch (e) {
        return false;
      }
    });
  }, [shifts, weekStart]);

  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato nell'anagrafica." })
      return
    }

    setIsGenerating(true)
    
    try {
      if (weekShifts.length > 0) {
        for (const shift of weekShifts) {
          const shiftRef = doc(db, "employees", shift.employeeId, "shifts", shift.id);
          deleteDocumentNonBlocking(shiftRef);
        }
      }

      for (const emp of employees) {
        if (!emp.isActive) continue;

        for (let i = 0; i < 6; i++) { 
          const targetDay = addDays(weekStart, i)
          const dayOfWeekStr = targetDay.getDay().toString()
          
          if (dayOfWeekStr === emp.restDay) continue;

          const dateStr = format(targetDay, 'yyyy-MM-dd')

          if (emp.contractType === "full-time") {
            const idMORNING = `shift-${emp.id}-${dateStr}-MORNING`;
            const startAM = new Date(targetDay); startAM.setHours(9, 0, 0);
            const endAM = new Date(targetDay); endAM.setHours(13, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idMORNING), {
              id: idMORNING,
              employeeId: emp.id,
              title: "Turno Mattina",
              date: dateStr,
              startTime: startAM.toISOString(),
              endTime: endAM.toISOString(),
              status: "SCHEDULED",
              companyId: "default",
              slot: "MORNING"
            }, { merge: true });

            const idAFTERNOON = `shift-${emp.id}-${dateStr}-AFTERNOON`;
            const startPM = new Date(targetDay); startPM.setHours(17, 0, 0);
            const endPM = new Date(targetDay); endPM.setHours(20, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAFTERNOON), {
              id: idAFTERNOON,
              employeeId: emp.id,
              title: "Turno Pomeriggio",
              date: dateStr,
              startTime: startPM.toISOString(),
              endTime: endPM.toISOString(),
              status: "SCHEDULED",
              companyId: "default",
              slot: "AFTERNOON"
            }, { merge: true });
          } 
          else {
            const idAFTERNOON = `shift-${emp.id}-${dateStr}-AFTERNOON`;
            const startPT = new Date(targetDay); startPT.setHours(17, 0, 0);
            const endPT = new Date(targetDay); endPT.setHours(20, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAFTERNOON), {
              id: idAFTERNOON,
              employeeId: emp.id,
              title: "Turno Pomeriggio (PT)",
              date: dateStr,
              startTime: startPT.toISOString(),
              endTime: endPT.toISOString(),
              status: "SCHEDULED",
              companyId: "default",
              slot: "AFTERNOON"
            }, { merge: true });
          }
        }
      }

      toast({ 
        title: "Pianificazione Resettata", 
        description: `La settimana del ${format(weekStart, 'dd/MM')} è stata pulita e rigenerata con successo.` 
      })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Errore durante la generazione" })
    } finally {
      setIsGenerating(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') setCurrentDate(new Date())
    else if (direction === 'prev') setCurrentDate(subDays(currentDate, 7))
    else setCurrentDate(addDays(currentDate, 7))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Pianificazione Turni Team</h1>
          <p className="text-muted-foreground">Gestione settimanale con distinzione visiva dinamica per sede operativa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="gap-2 border-[#227FD8] text-[#227FD8] font-black shadow-sm">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Resetta e Rigenera Settimana
          </Button>
          <Button className="gap-2 bg-[#227FD8] font-black shadow-md hover:bg-[#227FD8]/90"><Plus className="h-4 w-4" /> Nuovo Turno</Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col items-center min-w-[200px]">
            <span className="text-lg font-black text-[#1e293b] uppercase tracking-tighter">
              {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: it })}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Settimana Selezionata</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="rounded-full"><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigateWeek('today')} className="font-bold">Torna ad Oggi</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-start">
        {daysOfVisualizedWeek.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const isToday = isSameDay(day, new Date())
          const shiftsForDay = weekShifts.filter(s => s.date === dayStr)
          
          const morningShifts = shiftsForDay.filter(s => {
            const start = parseISO(s.startTime).getHours()
            return start < 14
          }).sort((a, b) => a.startTime.localeCompare(b.startTime))

          const afternoonShifts = shiftsForDay.filter(s => {
            const start = parseISO(s.startTime).getHours()
            return start >= 14
          }).sort((a, b) => a.startTime.localeCompare(b.startTime))
          
          return (
            <Card key={dayStr} className={cn(
              "border-none shadow-sm overflow-hidden flex flex-col min-h-[550px]",
              isToday ? "bg-[#227FD8]/5 ring-2 ring-[#227FD8]/20" : "bg-white/80"
            )}>
              <div className={cn(
                "p-3 text-center border-b font-black uppercase tracking-tighter",
                isToday ? "bg-[#227FD8] text-white" : "bg-muted/30 text-[#1e293b]"
              )}>
                <div className="text-xs">{format(day, 'EEEE', { locale: it })}</div>
                <div className="text-xl">{format(day, 'dd')}</div>
              </div>
              <CardContent className="p-2 flex-1 space-y-4">
                {isShiftsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md text-amber-700">
                        <Sun className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Mattina</span>
                      </div>
                      {morningShifts.length > 0 ? morningShifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} emp={employeeMap[shift.employeeId]} db={db} styles={locationStyles} />
                      )) : (
                        <div className="text-[8px] text-center text-muted-foreground/40 italic py-2">Nessun turno</div>
                      )}
                    </div>

                    <div className="border-t border-dashed" />

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md text-blue-700">
                        <Moon className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Pomeriggio</span>
                      </div>
                      {afternoonShifts.length > 0 ? afternoonShifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} emp={employeeMap[shift.employeeId]} db={db} styles={locationStyles} />
                      )) : (
                        <div className="text-[8px] text-center text-muted-foreground/40 italic py-2">Nessun turno</div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-[11px] font-bold text-amber-800">
              La funzione "Resetta e Rigenera" rimuove tutti i turni presenti nella settimana visualizzata prima di creare i nuovi orari.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest">Legenda Sedi Attive</h4>
            <div className="flex flex-wrap gap-4">
              {locations && locations.length > 0 ? locations.map((loc) => {
                const style = locationStyles[loc.id] || TAILWIND_COLORS[0]
                return (
                  <div key={loc.id} className="flex items-center gap-1.5">
                    <div className={cn("h-3 w-1 rounded-full", style.dot)} />
                    <span className="text-[9px] font-bold uppercase">{loc.name}</span>
                  </div>
                )
              }) : (
                <span className="text-[9px] text-muted-foreground italic">Nessuna sede configurata</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ShiftCard({ shift, emp, db, styles }: { shift: any, emp: any, db: any, styles: any }) {
  const start = parseISO(shift.startTime)
  const end = parseISO(shift.endTime)
  
  const style = styles[emp?.locationId] || TAILWIND_COLORS[0]

  return (
    <div className={cn(
      "group relative border rounded-xl p-2 shadow-sm hover:shadow-md transition-all border-l-4",
      style.border,
      style.bg
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="h-6 w-6 border shadow-xs">
          <AvatarImage src={emp?.photoUrl} />
          <AvatarFallback className="text-[8px] font-bold">{emp?.firstName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black truncate text-[#1e293b]">{emp?.firstName} {emp?.lastName?.charAt(0)}.</span>
          {emp?.locationName && (
            <span className="text-[7px] font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2 w-2" /> {emp.locationName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[9px] font-bold text-[#227FD8]">
        <Clock className="h-3 w-3" />
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-destructive text-white hover:bg-destructive/90"
        onClick={() => deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id))}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  )
}
