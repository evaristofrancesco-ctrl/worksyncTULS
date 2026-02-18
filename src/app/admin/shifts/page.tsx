
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
  Timer,
  Users
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysOfVisualizedWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [weekStart])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees, isLoading: isEmployeesLoading } = useCollection(employeesQuery)

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

  const weekShifts = useMemo(() => {
    if (!shifts) return [];
    const weekEnd = addDays(weekStart, 7);
    return shifts.filter(s => {
      if (s.companyId !== "default") return false;
      try {
        const d = parseISO(s.date);
        return d >= weekStart && d < weekEnd;
      } catch (e) { return false; }
    });
  }, [shifts, weekStart]);

  const weekAbsences = useMemo(() => {
    if (!allRequests) return [];
    const weekEnd = addDays(weekStart, 7);
    return allRequests.filter(r => {
      const status = (r.status || "").toUpperCase();
      if (status !== "APPROVATO" && status !== "APPROVED" && status !== "Approvato") return false;
      try {
        const start = parseISO(r.startDate);
        const end = r.endDate ? parseISO(r.endDate) : start;
        return (start < weekEnd && end >= weekStart);
      } catch (e) { return false; }
    });
  }, [allRequests, weekStart]);

  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato." });
      return;
    }
    setIsGenerating(true);
    try {
      if (weekShifts.length > 0) {
        for (const shift of weekShifts) {
          deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id));
        }
      }
      for (const emp of employees) {
        if (!emp.isActive) continue;
        for (let i = 0; i < 6; i++) { 
          const targetDay = addDays(weekStart, i);
          const dayOfWeekStr = targetDay.getDay().toString();
          const dateStr = format(targetDay, 'yyyy-MM-dd');
          
          const isRestDay = dayOfWeekStr === emp.restDay;
          const rStart = emp.restStartTime || "00:00";
          const rEnd = emp.restEndTime || "00:00";

          // Controllo assenze approvate
          const isAbsent = weekAbsences.some(abs => 
            abs.employeeId === emp.id && dateStr >= abs.startDate && dateStr <= (abs.endDate || abs.startDate) && abs.type !== 'HOURLY_PERMIT'
          );
          if (isAbsent) continue;

          if (emp.contractType === "full-time") {
            // Turno Mattina: 09:00 - 13:00
            const morningOverlaps = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
            if (!morningOverlaps) {
              const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
              const startAM = new Date(targetDay); startAM.setHours(9, 0, 0);
              const endAM = new Date(targetDay); endAM.setHours(13, 0, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
                id: idAM, employeeId: emp.id, title: "Turno Mattina", date: dateStr, startTime: startAM.toISOString(), endTime: endAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING"
              }, { merge: true });
            }

            // Turno Pomeriggio: 17:00 - 20:20
            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const startPM = new Date(targetDay); startPM.setHours(17, 0, 0);
              const endPM = new Date(targetDay); endPM.setHours(20, 20, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
                id: idPM, employeeId: emp.id, title: "Turno Pomeriggio", date: dateStr, startTime: startPM.toISOString(), endTime: endPM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON"
              }, { merge: true });
            }
          } else {
            // Part-time: 17:00 - 20:20
            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const startPT = new Date(targetDay); startPT.setHours(17, 0, 0);
              const endPT = new Date(targetDay); endPT.setHours(20, 20, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
                id: idPM, employeeId: emp.id, title: "Turno Pomeriggio (PT)", date: dateStr, startTime: startPT.toISOString(), endTime: endPT.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON"
              }, { merge: true });
            }
          }
        }
      }
      toast({ title: "Settimana Rigenerata", description: "Turni aggiornati rispettando le fasce di riposo orarie." });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleSaveAbsence = () => {
    if (!newAbsence.employeeId || !newAbsence.startDate) {
      toast({ variant: "destructive", title: "Errore", description: "Campi obbligatori mancanti." });
      return;
    }
    const id = `abs-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "employees", newAbsence.employeeId, "requests", id), {
      ...newAbsence, id, status: "Approvato", submittedAt: new Date().toISOString(), adminNote: "Inserito da Amministratore"
    }, { merge: true });
    setIsAbsenceOpen(false);
    toast({ title: "Assenza Salvata" });
  }

  const navigateWeek = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') setCurrentDate(new Date());
    else if (dir === 'prev') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 7));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pianificazione Turni</h1>
          <p className="text-slate-500 font-medium">Visualizzazione agenda: Giorni x Collaboratori.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="font-bold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 h-11 px-6">
                <UserMinus className="h-4 w-4 mr-2" /> Registra Assenza
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl">Assenza Dipendente</DialogTitle>
                <DialogDescription>Inserisci ferie, malattia o permessi.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Dipendente</Label>
                  <Select value={newAbsence.employeeId} onValueChange={(v) => setNewAbsence({...newAbsence, employeeId: v})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Tipo</Label>
                    <Select value={newAbsence.type} onValueChange={(v) => setNewAbsence({...newAbsence, type: v})}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VACATION">Ferie</SelectItem>
                        <SelectItem value="SICK">Malattia</SelectItem>
                        <SelectItem value="PERSONAL">Permesso</SelectItem>
                        <SelectItem value="HOURLY_PERMIT">Permesso Orario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Giorno</Label>
                    <Input type="date" className="h-11" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} />
                  </div>
                </div>

                {newAbsence.type === 'HOURLY_PERMIT' && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label className="font-bold uppercase text-xs text-slate-500">Dalle ore</Label>
                      <Input type="time" className="h-11" value={newAbsence.startTime} onChange={e => setNewAbsence({...newAbsence, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold uppercase text-xs text-slate-500">Alle ore</Label>
                      <Input type="time" className="h-11" value={newAbsence.endTime} onChange={e => setNewAbsence({...newAbsence, endTime: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Nota</Label>
                  <Textarea placeholder="..." value={newAbsence.reason} onChange={e => setNewAbsence({...newAbsence, reason: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAbsenceOpen(false)} className="font-bold">Annulla</Button>
                <Button onClick={handleSaveAbsence} className="bg-amber-500 hover:bg-amber-600 font-black px-8 h-11">CONFERMA</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="font-bold border-blue-200 text-[#227FD8] h-11">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Genera Settimana
          </Button>
          <Button className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-11 shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> Nuovo Turno
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-9 w-9 rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
              <div className="text-center min-w-[200px]">
                <span className="text-lg font-black text-slate-900 uppercase">
                  {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-9 w-9 rounded-full"><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigateWeek('today')} className="font-bold h-8 px-4 text-xs uppercase tracking-wider">Oggi</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full h-[700px]">
            <div className="inline-block min-w-full">
              {/* Header Tabella: Collaboratori (Sticky in alto) */}
              <div className="flex sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="w-[180px] p-4 font-black text-[10px] uppercase tracking-widest text-slate-400 sticky left-0 bg-white border-r z-40 flex items-center justify-center">
                  DATA / TEAM
                </div>
                {employees?.map((emp) => (
                  <div key={emp.id} className="min-w-[220px] p-4 border-r flex items-center gap-3 bg-white">
                    <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-bold">{emp.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 truncate text-sm">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase truncate tracking-tighter">{emp.jobTitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Corpo Tabella: Giorni (Righe) */}
              <div className="divide-y">
                {isEmployeesLoading || isShiftsLoading ? (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[#227FD8]" />
                    <p className="text-sm font-bold text-slate-400">Analisi pianificazione...</p>
                  </div>
                ) : daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div key={dayStr} className={cn(
                      "flex group hover:bg-slate-50/30 transition-colors",
                      isToday ? "bg-blue-50/20" : ""
                    )}>
                      {/* Colonna Giorno (Sticky a sinistra) */}
                      <div className="w-[180px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center items-center text-center shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                        <div className="text-[10px] font-black uppercase text-slate-400">{format(day, 'EEEE', { locale: it })}</div>
                        <div className={cn("text-xl font-black mt-1 leading-none", isToday ? "text-[#227FD8]" : "text-slate-700")}>
                          {format(day, 'dd')}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{format(day, 'MMMM', { locale: it })}</div>
                      </div>

                      {/* Celle Collaboratori per questo Giorno */}
                      {employees?.map((emp) => {
                        const dayShifts = weekShifts.filter(s => s.employeeId === emp.id && s.date === dayStr);
                        const dayAbsence = weekAbsences.find(abs => abs.employeeId === emp.id && dayStr >= abs.startDate && dayStr <= (abs.endDate || abs.startDate));
                        const isRestDay = emp.restDay === day.getDay().toString();
                        const rStart = emp.restStartTime || "00:00";
                        const rEnd = emp.restEndTime || "00:00";

                        return (
                          <div key={`${dayStr}-${emp.id}`} className={cn(
                            "min-w-[220px] p-2 border-r last:border-r-0 flex flex-col gap-2 min-h-[140px]",
                            isRestDay ? "bg-slate-50/50" : ""
                          )}>
                            {/* Visualizzazione Riposo Orario se è il suo giorno di riposo e non ha assenze totali */}
                            {isRestDay && !dayAbsence && (
                              <div className="rounded-lg border border-dashed border-slate-300 p-2 bg-white/40 flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Sun className="h-3 w-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Riposo</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">{rStart} - {rEnd}</span>
                              </div>
                            )}

                            {dayAbsence && (
                              <AbsenceItem abs={dayAbsence} db={db} />
                            )}

                            {dayShifts.map(shift => (
                              <ShiftItem key={shift.id} shift={shift} db={db} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function ShiftItem({ shift, db }: { shift: any, db: any }) {
  const start = parseISO(shift.startTime);
  const end = parseISO(shift.endTime);
  const isMorning = start.getHours() < 14;

  return (
    <div className={cn(
      "group relative rounded-xl p-3 border-l-4 shadow-sm transition-all animate-in zoom-in-95 duration-200",
      isMorning ? "bg-amber-50/50 border-amber-400 text-amber-900" : "bg-blue-50/50 border-blue-400 text-blue-900"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
          {isMorning ? "Mattina" : "Pomeriggio"}
        </span>
        <button 
          onClick={() => deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id))}
          className="h-5 w-5 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 font-black text-sm">
        <Clock className="h-3.5 w-3.5" />
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </div>
    </div>
  )
}

function AbsenceItem({ abs, db }: { abs: any, db: any }) {
  const Icon = abs.type === 'SICK' ? Activity : abs.type === 'VACATION' ? Umbrella : Timer;
  const labels: any = { VACATION: 'Ferie', SICK: 'Malattia', PERSONAL: 'Permesso', HOURLY_PERMIT: 'Orario', REST_SWAP: 'Cambio Riposo' };
  
  return (
    <div className="group relative rounded-xl p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-900 shadow-sm animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{labels[abs.type]}</span>
        <button 
          onClick={() => deleteDocumentNonBlocking(doc(db, "employees", abs.employeeId, "requests", abs.id))}
          className="h-5 w-5 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 font-black text-sm">
        <Icon className="h-4 w-4" />
        <span className="truncate">
          {abs.type === 'HOURLY_PERMIT' ? `${abs.startTime} - ${abs.endTime}` : 'Assenza Totale'}
        </span>
      </div>
    </div>
  )
}
