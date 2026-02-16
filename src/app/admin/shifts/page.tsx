
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
  Info
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

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Filtra i turni per la settimana visualizzata
  const weekShifts = useMemo(() => {
    if (!shifts) return [];
    const weekEnd = addDays(weekStart, 7);
    return shifts.filter(s => {
      const d = parseISO(s.date);
      return d >= weekStart && d < weekEnd;
    });
  }, [shifts, weekStart]);

  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato nell'anagrafica." })
      return
    }

    setIsGenerating(true)
    
    try {
      let totalGenerated = 0
      // Genera per la settimana attualmente visualizzata (Lun-Sab)
      for (const emp of employees) {
        if (!emp.isActive) continue;

        for (let i = 0; i < 6; i++) { // Da Lunedì (0) a Sabato (5)
          const targetDay = addDays(weekStart, i)
          const dayOfWeekStr = targetDay.getDay().toString()
          
          if (dayOfWeekStr === emp.restDay) continue;

          const dateStr = format(targetDay, 'yyyy-MM-dd')

          // FULL TIME (40h/settimana): 09:00-13:00 e 17:00-20:00
          if (emp.contractType === "full-time") {
            const idAM = `shift-${emp.id}-${dateStr}-AM`;
            const startAM = new Date(targetDay); startAM.setHours(9, 0, 0);
            const endAM = new Date(targetDay); endAM.setHours(13, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
              id: idAM,
              employeeId: emp.id,
              title: "Turno Mattina",
              date: dateStr,
              startTime: startAM.toISOString(),
              endTime: endAM.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });

            const idPM = `shift-${emp.id}-${dateStr}-PM`;
            const startPM = new Date(targetDay); startPM.setHours(17, 0, 0);
            const endPM = new Date(targetDay); endPM.setHours(20, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
              id: idPM,
              employeeId: emp.id,
              title: "Turno Pomeriggio",
              date: dateStr,
              startTime: startPM.toISOString(),
              endTime: endPM.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });
            
            totalGenerated += 2;
          } 
          // PART TIME: Solo 17:00-20:00
          else {
            const idPT = `shift-${emp.id}-${dateStr}-PT`;
            const startPT = new Date(targetDay); startPT.setHours(17, 0, 0);
            const endPT = new Date(targetDay); endPT.setHours(20, 0, 0);
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPT), {
              id: idPT,
              employeeId: emp.id,
              title: "Turno Pomeriggio (PT)",
              date: dateStr,
              startTime: startPT.toISOString(),
              endTime: endPT.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });
            
            totalGenerated += 1;
          }
        }
      }

      toast({ 
        title: "Pianificazione Completata", 
        description: `Generati ${totalGenerated} turni per la settimana del ${format(weekStart, 'dd/MM')}.` 
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
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Pianificazione Turni TU.L.S.</h1>
          <p className="text-muted-foreground">Calendario settimanale: FT (9-13, 17-20), PT (17-20).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="gap-2 border-[#227FD8] text-[#227FD8] font-black">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera in questa settimana
          </Button>
          <Button className="gap-2 bg-[#227FD8] font-black shadow-md"><Plus className="h-4 w-4" /> Nuovo Turno</Button>
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

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {daysOfVisualizedWeek.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const isToday = isSameDay(day, new Date())
          const shiftsForDay = weekShifts.filter(s => s.date === dayStr).sort((a, b) => a.startTime.localeCompare(b.startTime))
          
          return (
            <Card key={dayStr} className={cn(
              "border-none shadow-sm overflow-hidden flex flex-col min-h-[400px]",
              isToday ? "bg-[#227FD8]/5 ring-2 ring-[#227FD8]/20" : "bg-white/80"
            )}>
              <div className={cn(
                "p-3 text-center border-b font-black uppercase tracking-tighter",
                isToday ? "bg-[#227FD8] text-white" : "bg-muted/30 text-[#1e293b]"
              )}>
                <div className="text-xs">{format(day, 'EEEE', { locale: it })}</div>
                <div className="text-xl">{format(day, 'dd')}</div>
              </div>
              <CardContent className="p-2 flex-1 space-y-2">
                {isShiftsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : shiftsForDay.length > 0 ? shiftsForDay.map(shift => {
                  const emp = employeeMap[shift.employeeId]
                  const start = parseISO(shift.startTime)
                  const end = parseISO(shift.endTime)
                  
                  return (
                    <div key={shift.id} className="group relative bg-white border rounded-xl p-2 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar className="h-6 w-6 border shadow-xs">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="text-[8px] font-bold">{emp?.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-black truncate text-[#1e293b]">{emp?.firstName} {emp?.lastName?.charAt(0)}.</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-[#227FD8]">
                        <Clock className="h-3 w-3" />
                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                      </div>
                      <div className="mt-1 text-[8px] font-black text-muted-foreground uppercase truncate">
                        {shift.title}
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
                }) : (
                  <div className="h-full flex items-center justify-center opacity-20 py-10">
                    <CalendarIcon className="h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-amber-600" />
          <p className="text-xs font-bold text-amber-800">
            La griglia mostra i turni pianificati. Il sistema automatizzato genera turni Lun-Sab rispettando il riposo settimanale di ogni collaboratore.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
