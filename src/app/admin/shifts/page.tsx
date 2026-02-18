
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
  Users,
  Building2,
  Lock
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
import { Separator } from "@/components/ui/separator"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Stati per i Dialog
  const [isAbsenceOpen, setIsAbsenceOpen] = useState(false)
  const [isShiftOpen, setIsShiftOpen] = useState(false)

  // Dati per nuova assenza
  const [newAbsence, setNewAbsence] = useState({
    employeeId: "",
    type: "VACATION",
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: "",
    startTime: "09:00",
    endTime: "13:00",
    reason: ""
  })

  // Dati per nuovo turno manuale
  const [newManualShift, setNewManualShift] = useState({
    employeeId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "13:00",
    title: "Turno Manuale"
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

  // Filtro per escludere Francesco Evaristo e IT
  const displayEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      const isIT = emp.jobTitle?.toLowerCase().includes('it');
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isIT && !isFrancesco;
    });
  }, [employees]);

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

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
      if (s.companyId !== "default" && s.companyId) return false;
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
    if (!displayEmployees || displayEmployees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente operativo trovato." });
      return;
    }
    setIsGenerating(true);
    try {
      if (weekShifts.length > 0) {
        for (const shift of weekShifts) {
          if (shift.type !== "MANUAL") {
            deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id));
          }
        }
      }
      
      for (const emp of displayEmployees) {
        if (!emp.isActive) continue;
        for (let i = 0; i < 6; i++) { 
          const targetDay = addDays(weekStart, i);
          const dayOfWeekStr = targetDay.getDay().toString();
          const dateStr = format(targetDay, 'yyyy-MM-dd');
          
          const isRestDay = dayOfWeekStr === emp.restDay;
          const rStart = emp.restStartTime || "00:00";
          const rEnd = emp.restEndTime || "00:00";

          const isAbsent = weekAbsences.some(abs => 
            abs.employeeId === emp.id && dateStr >= abs.startDate && dateStr <= (abs.endDate || abs.startDate) && abs.type !== 'HOURLY_PERMIT'
          );
          if (isAbsent) continue;

          if (emp.contractType === "full-time") {
            const morningOverlaps = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
            if (!morningOverlaps) {
              const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
              const hasManual = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() < 14);
              if (!hasManual) {
                const startAM = new Date(targetDay); startAM.setHours(9, 0, 0);
                const endAM = new Date(targetDay); endAM.setHours(13, 0, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
                  id: idAM, employeeId: emp.id, title: "Turno Mattina", date: dateStr, startTime: startAM.toISOString(), endTime: endAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING", type: "AUTO"
                }, { merge: true });
              }
            }

            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const hasManual = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() >= 14);
              if (!hasManual) {
                const startPM = new Date(targetDay); startPM.setHours(17, 0, 0);
                const endPM = new Date(targetDay); endPM.setHours(20, 20, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
                  id: idPM, employeeId: emp.id, title: "Turno Pomeriggio", date: dateStr, startTime: startPM.toISOString(), endTime: endPM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO"
                }, { merge: true });
              }
            }
          } else {
            const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!afternoonOverlaps) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const hasManual = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() >= 14);
              if (!hasManual) {
                const startPT = new Date(targetDay); startPT.setHours(17, 0, 0);
                const endPT = new Date(targetDay); endPT.setHours(20, 20, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
                  id: idPM, employeeId: emp.id, title: "Turno Pomeriggio (PT)", date: dateStr, startTime: startPT.toISOString(), endTime: endPT.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO"
                }, { merge: true });
              }
            }
          }
        }
      }
      toast({ title: "Settimana Rigenerata", description: "Turni aggiornati rispettando le fasce e i turni manuali." });
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

  const handleSaveManualShift = () => {
    if (!newManualShift.employeeId || !newManualShift.date || !newManualShift.startTime || !newManualShift.endTime) {
      toast({ variant: "destructive", title: "Errore", description: "Tutti i campi sono obbligatori." });
      return;
    }

    const id = `shift-man-${Date.now()}`;
    const startObj = new Date(`${newManualShift.date}T${newManualShift.startTime}`);
    const endObj = new Date(`${newManualShift.date}T${newManualShift.endTime}`);
    
    const startHour = startObj.getHours();
    const slot = startHour < 14 ? "MORNING" : "AFTERNOON";

    setDocumentNonBlocking(doc(db, "employees", newManualShift.employeeId, "shifts", id), {
      id,
      employeeId: newManualShift.employeeId,
      title: newManualShift.title || "Turno Extra",
      date: newManualShift.date,
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      status: "SCHEDULED",
      companyId: "default",
      slot: slot,
      type: "MANUAL"
    }, { merge: true });

    setIsShiftOpen(false);
    toast({ title: "Turno Inserito", description: "Il turno manuale è protetto dall'automatismo." });
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
                      {displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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

          <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-11 shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> Nuovo Turno
              </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl">Inserimento Turno</DialogTitle>
                <DialogDescription>Assegna manualmente un orario a un collaboratore.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Collaboratore</Label>
                  <Select value={newManualShift.employeeId} onValueChange={(v) => setNewManualShift({...newManualShift, employeeId: v})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      {displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Data Turno</Label>
                  <Input type="date" className="h-11" value={newManualShift.date} onChange={e => setNewManualShift({...newManualShift, date: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Ora Inizio</Label>
                    <Input type="time" className="h-11" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Ora Fine</Label>
                    <Input type="time" className="h-11" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Titolo (opzionale)</Label>
                  <Input placeholder="es. Turno Extra, Inventario..." value={newManualShift.title} onChange={e => setNewManualShift({...newManualShift, title: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsShiftOpen(false)} className="font-bold">Annulla</Button>
                <Button onClick={handleSaveManualShift} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black px-8 h-11">SALVA TURNO</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <div className="flex sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="w-[180px] p-4 font-black text-[10px] uppercase tracking-widest text-slate-400 sticky left-0 bg-white border-r z-40 flex items-center justify-center">
                  DATA / TEAM
                </div>
                {displayEmployees.map((emp) => (
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
                <div className="min-w-[250px] p-4 font-black text-[10px] uppercase tracking-widest text-[#227FD8] bg-blue-50/50 flex items-center justify-center border-l-2 border-[#227FD8]/20 sticky right-0 z-40 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                  COPERTURA SEDI
                </div>
              </div>

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
                      <div className="w-[180px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center items-center text-center shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                        <div className="text-[10px] font-black uppercase text-slate-400">{format(day, 'EEEE', { locale: it })}</div>
                        <div className={cn("text-xl font-black mt-1 leading-none", isToday ? "text-[#227FD8]" : "text-slate-700")}>
                          {format(day, 'dd')}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{format(day, 'MMMM', { locale: it })}</div>
                      </div>

                      {displayEmployees.map((emp) => {
                        const dayShifts = weekShifts.filter(s => s.employeeId === emp.id && s.date === dayStr);
                        const dayAbsences = weekAbsences.filter(abs => abs.employeeId === emp.id && dayStr >= abs.startDate && dayStr <= (abs.endDate || abs.startDate));
                        
                        const isRestDay = emp.restDay === day.getDay().toString();
                        const rStart = emp.restStartTime || "00:00";
                        const rEnd = emp.restEndTime || "00:00";

                        const allDayAbsences = dayAbsences.filter(a => a.type !== 'HOURLY_PERMIT');
                        const hourlyItems = [
                          ...dayShifts.map(s => ({ type: 'SHIFT', data: s, startHour: parseISO(s.startTime).getHours(), startMinute: parseISO(s.startTime).getMinutes() })),
                          ...dayAbsences.filter(a => a.type === 'HOURLY_PERMIT').map(a => {
                            const [h, m] = (a.startTime || "00:00").split(':').map(Number);
                            return { type: 'ABSENCE', data: a, startHour: h, startMinute: m };
                          })
                        ];

                        if (isRestDay) {
                          const [h, m] = rStart.split(':').map(Number);
                          hourlyItems.push({ type: 'REST', data: { startTime: rStart, endTime: rEnd }, startHour: h, startMinute: m });
                        }

                        const morningItems = hourlyItems.filter(i => i.startHour < 14).sort((a,b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute));
                        const afternoonItems = hourlyItems.filter(i => i.startHour >= 14).sort((a,b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute));

                        return (
                          <div key={`${dayStr}-${emp.id}`} className={cn(
                            "min-w-[220px] p-3 border-r last:border-r-0 flex flex-col gap-3 min-h-[180px]",
                            isRestDay ? "bg-slate-50/30" : ""
                          )}>
                            {allDayAbsences.length > 0 && (
                              <div className="space-y-1">
                                {allDayAbsences.map(abs => <AbsenceItem key={abs.id} abs={abs} db={db} />)}
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 opacity-30">
                                <span className="text-[8px] font-black tracking-widest uppercase">AM</span>
                                <div className="h-px flex-1 bg-slate-300" />
                              </div>
                              <div className="space-y-2">
                                {morningItems.map((act, idx) => (
                                  act.type === 'SHIFT' ? <ShiftItem key={act.data.id} shift={act.data} db={db} /> :
                                  act.type === 'REST' ? <RestItem key="rest-am" data={act.data} /> :
                                  <AbsenceItem key={act.data.id} abs={act.data} db={db} />
                                ))}
                                {morningItems.length === 0 && <div className="h-8 border border-dashed rounded-lg opacity-10" />}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 opacity-30">
                                <span className="text-[8px] font-black tracking-widest uppercase">PM</span>
                                <div className="h-px flex-1 bg-slate-300" />
                              </div>
                              <div className="space-y-2">
                                {afternoonItems.map((act, idx) => (
                                  act.type === 'SHIFT' ? <ShiftItem key={act.data.id} shift={act.data} db={db} /> :
                                  act.type === 'REST' ? <RestItem key="rest-pm" data={act.data} /> :
                                  <AbsenceItem key={act.data.id} abs={act.data} db={db} />
                                ))}
                                {afternoonItems.length === 0 && <div className="h-8 border border-dashed rounded-lg opacity-10" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="min-w-[250px] p-3 border-l-2 border-[#227FD8]/10 bg-blue-50/20 sticky right-0 z-20 shadow-[-4px_0_10_rgba(0,0,0,0.05)] flex flex-col gap-4">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-50">
                              <span className="text-[8px] font-black tracking-widest uppercase text-[#227FD8]">AM Copertura</span>
                              <div className="h-px flex-1 bg-blue-200" />
                            </div>
                            <div className="space-y-1">
                              {locations?.map(loc => {
                                const count = displayEmployees.filter(e => {
                                  if (e.locationId !== loc.id) return false;
                                  return weekShifts.some(s => s.employeeId === e.id && s.date === dayStr && parseISO(s.startTime).getHours() < 14);
                                }).length || 0;
                                
                                return (
                                  <div key={loc.id} className={cn(
                                    "flex justify-between items-center px-2 py-1.5 rounded-lg border shadow-sm transition-all",
                                    count === 0 
                                      ? "bg-rose-50 border-rose-200 animate-pulse ring-1 ring-rose-500/20" 
                                      : "bg-white/80 border-blue-100"
                                  )}>
                                    <span className={cn(
                                      "text-[9px] font-black truncate pr-2 uppercase tracking-tighter",
                                      count === 0 ? "text-rose-700" : "text-slate-700"
                                    )}>
                                      {loc.name}
                                    </span>
                                    {count === 0 ? (
                                      <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                                        <Badge variant="destructive" className="h-4 px-1 text-[8px] font-black uppercase">SCOPERTO</Badge>
                                      </div>
                                    ) : (
                                      <Badge className="h-4 px-1.5 text-[10px] font-black bg-[#227FD8]">{count}</Badge>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 opacity-50">
                              <span className="text-[8px] font-black tracking-widest uppercase text-slate-500">PM Copertura</span>
                              <div className="h-px flex-1 bg-slate-200" />
                            </div>
                            <div className="space-y-1">
                              {locations?.map(loc => {
                                const count = displayEmployees.filter(e => {
                                  if (e.locationId !== loc.id) return false;
                                  return weekShifts.some(s => s.employeeId === e.id && s.date === dayStr && parseISO(s.startTime).getHours() >= 14);
                                }).length || 0;
                                
                                return (
                                  <div key={loc.id} className={cn(
                                    "flex justify-between items-center px-2 py-1.5 rounded-lg border shadow-sm transition-all",
                                    count === 0 
                                      ? "bg-rose-50 border-rose-200 animate-pulse ring-1 ring-rose-500/20" 
                                      : "bg-white/80 border-slate-100"
                                  )}>
                                    <span className={cn(
                                      "text-[9px] font-black truncate pr-2 uppercase tracking-tighter",
                                      count === 0 ? "text-rose-700" : "text-slate-700"
                                    )}>
                                      {loc.name}
                                    </span>
                                    {count === 0 ? (
                                      <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                                        <Badge variant="destructive" className="h-4 px-1 text-[8px] font-black uppercase">SCOPERTO</Badge>
                                      </div>
                                    ) : (
                                      <Badge className="h-4 px-1.5 text-[10px] font-black bg-slate-700">{count}</Badge>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
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
  const isManual = shift.type === 'MANUAL';

  return (
    <div className={cn(
      "group relative rounded-lg p-2.5 border-l-4 shadow-sm transition-all animate-in zoom-in-95 duration-200",
      isMorning ? "bg-amber-50/50 border-amber-400 text-amber-900" : "bg-blue-50/50 border-blue-400 text-blue-900"
    )}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
            {shift.title || "Turno"}
          </span>
          {isManual && <Lock className="h-2.5 w-2.5 text-blue-600/50" title="Inserimento Manuale Protetto" />}
        </div>
        <button 
          onClick={() => deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id))}
          className="h-4 w-4 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 font-black text-xs">
        <Clock className="h-3 w-3" />
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </div>
    </div>
  )
}

function AbsenceItem({ abs, db }: { abs: any, db: any }) {
  const Icon = abs.type === 'SICK' ? Activity : abs.type === 'VACATION' ? Umbrella : Timer;
  const labels: any = { VACATION: 'Ferie', SICK: 'Malattia', PERSONAL: 'Permesso', HOURLY_PERMIT: 'Orario', REST_SWAP: 'Cambio Riposo' };
  
  return (
    <div className="group relative rounded-lg p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-900 shadow-sm animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{labels[abs.type]}</span>
        <button 
          onClick={() => deleteDocumentNonBlocking(doc(db, "employees", abs.employeeId, "requests", abs.id))}
          className="h-4 w-4 rounded-full bg-white/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 font-black text-xs">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">
          {abs.type === 'HOURLY_PERMIT' ? `${abs.startTime} - ${abs.endTime}` : 'Assenza Totale'}
        </span>
      </div>
    </div>
  )
}

function RestItem({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-2 bg-white/40 flex flex-col items-center justify-center gap-0.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1 text-slate-400">
        <Sun className="h-3 w-3" />
        <span className="text-[8px] font-black uppercase tracking-widest">Riposo</span>
      </div>
      <span className="text-[10px] font-bold text-slate-500">{data.startTime} - {data.endTime}</span>
    </div>
  )
}
