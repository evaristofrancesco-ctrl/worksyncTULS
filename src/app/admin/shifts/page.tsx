
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
  MapPin,
  UserMinus,
  Activity,
  Umbrella,
  AlertTriangle,
  Timer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup, query } from "firebase/firestore"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

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
  
  // Stati per la gestione delle assenze
  const [isAbsenceOpen, setIsAbsenceOpen] = useState(false)
  const [newAbsence, setNewAbsence] = useState({
    employeeId: "",
    type: "VACATION",
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: "",
    startTime: "09:00",
    endTime: "13:00",
    reason: ""
  })

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

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "requests");
  }, [db])
  const { data: allRequests } = useCollection(requestsQuery)

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

  const locationStyles = useMemo(() => {
    const map: Record<string, typeof TAILWIND_COLORS[0]> = {}
    if (!locations) return map
    
    locations.forEach((loc, index) => {
      map[loc.id] = TAILWIND_COLORS[index % TAILWIND_COLORS.length]
    })
    return map
  }, [locations])

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

  const weekAbsences = useMemo(() => {
    if (!allRequests) return [];
    const weekEnd = addDays(weekStart, 7);
    return allRequests.filter(r => {
      if (r.status !== "Approvato" && r.status !== "APPROVED") return false;
      try {
        const start = parseISO(r.startDate);
        const end = r.endDate ? parseISO(r.endDate) : start;
        return (start < weekEnd && end >= weekStart);
      } catch (e) { return false; }
    });
  }, [allRequests, weekStart]);

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
          const dateStr = format(targetDay, 'yyyy-MM-dd')

          // Salta se è il giorno di riposo
          if (dayOfWeekStr === emp.restDay) continue;

          // Salta se il dipendente ha un'assenza registrata per questo giorno (escludiamo i permessi orari per la generazione automatica o li gestiamo se necessario)
          const isAbsent = weekAbsences.some(abs => 
            abs.employeeId === emp.id && 
            dateStr >= abs.startDate && 
            dateStr <= (abs.endDate || abs.startDate) &&
            abs.type !== 'HOURLY_PERMIT' // I permessi orari non bloccano l'intera giornata solitamente
          );
          if (isAbsent) continue;

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
        description: `La settimana del ${format(weekStart, 'dd/MM')} è stata pulita e rigenerata tenendo conto delle assenze.` 
      })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Errore durante la generazione" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveAbsence = () => {
    if (!newAbsence.employeeId || !newAbsence.startDate) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona dipendente e data inizio." })
      return
    }

    const requestId = `admin-abs-${Date.now()}`
    const ref = doc(db, "employees", newAbsence.employeeId, "requests", requestId)
    
    setDocumentNonBlocking(ref, {
      ...newAbsence,
      id: requestId,
      status: "Approvato",
      submittedAt: new Date().toISOString(),
      adminNote: "Registrato manualmente dall'amministrazione"
    }, { merge: true })

    setIsAbsenceOpen(false)
    setNewAbsence({ 
      employeeId: "", 
      type: "VACATION", 
      startDate: format(new Date(), 'yyyy-MM-dd'), 
      endDate: "", 
      startTime: "09:00", 
      endTime: "13:00", 
      reason: "" 
    })
    toast({ title: "Assenza Registrata", description: "L'assenza è stata inserita e auto-approvata." })
  }

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') setCurrentDate(new Date())
    else if (direction === 'prev') setCurrentDate(subDays(currentDate, 7))
    else setCurrentDate(addDays(currentDate, 7))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b]">Pianificazione Turni Team</h1>
          <p className="text-sm text-muted-foreground">Gestione turni e monitoraggio indisponibilità (Malattie/Ferie/Permessi).</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-amber-500 text-amber-600 font-black h-11 px-5 shadow-sm uppercase">
                <UserMinus className="h-4 w-4" /> Registra Assenza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl">Registra Malattia/Ferie/Permessi</DialogTitle>
                <DialogDescription>L'assenza verrà mostrata in calendario e i turni automatici verranno saltati per quel periodo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Dipendente *</Label>
                  <Select value={newAbsence.employeeId} onValueChange={(v) => setNewAbsence({...newAbsence, employeeId: v})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Seleziona un collaboratore..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Tipo Assenza</Label>
                    <Select value={newAbsence.type} onValueChange={(v) => setNewAbsence({...newAbsence, type: v})}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VACATION">Ferie</SelectItem>
                        <SelectItem value="SICK">Malattia</SelectItem>
                        <SelectItem value="PERSONAL">Permesso Giornaliero</SelectItem>
                        <SelectItem value="HOURLY_PERMIT">Permesso Orario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Data Inizio *</Label>
                    <Input type="date" className="h-11" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} />
                  </div>
                </div>

                {newAbsence.type === 'HOURLY_PERMIT' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Ora Inizio</Label>
                      <Input type="time" className="h-11" value={newAbsence.startTime} onChange={e => setNewAbsence({...newAbsence, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Ora Fine</Label>
                      <Input type="time" className="h-11" value={newAbsence.endTime} onChange={e => setNewAbsence({...newAbsence, endTime: e.target.value})} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Data Fine (opzionale)</Label>
                      <Input type="date" className="h-11" value={newAbsence.endDate} onChange={e => setNewAbsence({...newAbsence, endDate: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">Nota Amministrazione</Label>
                  <Textarea placeholder="es. Certificato medico inviato, urgenza familiare, ecc." value={newAbsence.reason} onChange={e => setNewAbsence({...newAbsence, reason: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAbsenceOpen(false)} className="font-bold">Annulla</Button>
                <Button onClick={handleSaveAbsence} className="bg-amber-500 hover:bg-amber-600 font-black h-12 px-10 uppercase shadow-lg">CONFERMA REGISTRAZIONE</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="gap-2 border-[#227FD8] text-[#227FD8] font-black h-11 px-5 shadow-sm uppercase">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Reset e Rigenera
          </Button>
          <Button className="gap-2 bg-[#227FD8] font-black h-11 px-6 shadow-md hover:bg-[#227FD8]/90 uppercase text-xs">
            <Plus className="h-4 w-4" /> Nuovo Turno
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-10 w-10 rounded-full hover:bg-slate-100"><ChevronLeft className="h-6 w-6" /></Button>
          <div className="flex flex-col items-center min-w-[240px]">
            <span className="text-xl font-black text-[#1e293b] uppercase tracking-tight">
              {format(weekStart, 'dd MMMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMMM', { locale: it })}
            </span>
            <span className="text-xs font-bold text-muted-foreground mt-0.5">Settimana in corso</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-10 w-10 rounded-full hover:bg-slate-100"><ChevronRight className="h-6 w-6" /></Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigateWeek('today')} className="font-black h-9 px-6 text-xs uppercase tracking-widest border border-slate-200">OGGI</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-start">
        {daysOfVisualizedWeek.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const isToday = isSameDay(day, new Date())
          
          const shiftsForDay = weekShifts.filter(s => s.date === dayStr)
          const absencesForDay = weekAbsences.filter(abs => {
            const start = abs.startDate;
            const end = abs.endDate || abs.startDate;
            return dayStr >= start && dayStr <= end;
          });

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
              "border-none shadow-sm overflow-hidden flex flex-col min-h-[550px] transition-all duration-300",
              isToday ? "bg-[#227FD8]/5 ring-2 ring-[#227FD8]/30 shadow-blue-100 shadow-xl" : "bg-white"
            )}>
              <div className={cn(
                "p-3 text-center border-b font-black uppercase tracking-tight",
                isToday ? "bg-[#227FD8] text-white" : "bg-slate-50 text-[#1e293b]"
              )}>
                <div className="text-[11px] opacity-80">{format(day, 'EEEE', { locale: it })}</div>
                <div className="text-2xl leading-none mt-1">{format(day, 'dd')}</div>
              </div>
              <CardContent className="p-3 flex-1 space-y-6">
                {isShiftsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-30" /></div>
                ) : (
                  <>
                    {/* Visualizzazione Assenze */}
                    {absencesForDay.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Indisponibili</div>
                        {absencesForDay.map(abs => (
                          <AbsenceCard key={abs.id} abs={abs} emp={employeeMap[abs.employeeId]} db={db} />
                        ))}
                        <div className="border-b border-dashed border-slate-200 my-4" />
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2 py-1 bg-amber-50 rounded-lg text-amber-700">
                        <div className="flex items-center gap-2">
                          <Sun className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Mattina</span>
                        </div>
                        <span className="text-[9px] font-bold opacity-70">{morningShifts.length}</span>
                      </div>
                      <div className="space-y-2.5">
                        {morningShifts.length > 0 ? morningShifts.map(shift => (
                          <ShiftCard key={shift.id} shift={shift} emp={employeeMap[shift.employeeId]} db={db} styles={locationStyles} />
                        )) : (
                          <div className="text-[9px] text-center text-muted-foreground/20 italic py-2 border border-dashed rounded-lg">Vuoto</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2 py-1 bg-blue-50 rounded-lg text-blue-700">
                        <div className="flex items-center gap-2">
                          <Moon className="h-3 w-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Pomeriggio</span>
                        </div>
                        <span className="text-[9px] font-bold opacity-70">{afternoonShifts.length}</span>
                      </div>
                      <div className="space-y-2.5">
                        {afternoonShifts.length > 0 ? afternoonShifts.map(shift => (
                          <ShiftCard key={shift.id} shift={shift} emp={employeeMap[shift.employeeId]} db={db} styles={locationStyles} />
                        )) : (
                          <div className="text-[9px] text-center text-muted-foreground/20 italic py-2 border border-dashed rounded-lg">Vuoto</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
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
      "group relative border rounded-xl p-3 shadow-sm transition-all border-l-[4px] bg-white hover:shadow-md hover:ring-1 hover:ring-primary/10",
      style.border
    )}>
      <div className="flex items-center gap-2.5 mb-2">
        <Avatar className="h-7 w-7 border shadow-sm ring-1 ring-white">
          <AvatarImage src={emp?.photoUrl} />
          <AvatarFallback className="text-[10px] font-bold bg-slate-100">{emp?.firstName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black truncate text-[#1e293b] leading-tight">
            {emp?.firstName} {emp?.lastName?.charAt(0)}.
          </span>
          <span className="text-[8px] font-bold text-muted-foreground uppercase truncate">
            {emp?.jobTitle || "Collaboratore"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-black text-[#227FD8] bg-blue-50/50 w-fit px-2 py-0.5 rounded-md">
        <Clock className="h-3 w-3" />
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all rounded-full bg-destructive text-white hover:bg-destructive/90 shadow-lg scale-90 hover:scale-100"
        onClick={() => deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function AbsenceCard({ abs, emp, db }: { abs: any, emp: any, db: any }) {
  const isHourly = abs.type === 'HOURLY_PERMIT';
  const Icon = abs.type === 'SICK' ? Activity : abs.type === 'VACATION' ? Umbrella : isHourly ? Timer : UserMinus;
  const colorClass = abs.type === 'SICK' 
    ? 'bg-rose-50 text-rose-700 border-rose-200' 
    : abs.type === 'VACATION' 
    ? 'bg-amber-50 text-amber-700 border-amber-200' 
    : isHourly 
    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
    : 'bg-slate-50 text-slate-700 border-slate-200';

  const typeLabel = abs.type === 'SICK' ? 'Malattia' 
                  : abs.type === 'VACATION' ? 'Ferie' 
                  : abs.type === 'HOURLY_PERMIT' ? 'Permesso Orario'
                  : 'Permesso';

  return (
    <div className={cn("group relative border rounded-xl p-3 shadow-sm border-l-[4px] transition-all", colorClass)}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-white/50 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black truncate">{emp?.firstName} {emp?.lastName?.charAt(0)}.</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider opacity-80">
              {typeLabel}
            </span>
            {isHourly && abs.startTime && (
              <span className="text-[9px] font-bold text-cyan-800">
                {abs.startTime} - {abs.endTime}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all rounded-full bg-slate-600 text-white shadow-lg scale-90 hover:scale-100"
        onClick={() => deleteDocumentNonBlocking(doc(db, "employees", abs.employeeId, "requests", abs.id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
