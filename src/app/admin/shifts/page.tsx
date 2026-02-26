
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
  Edit,
  User,
  Sun,
  Moon,
  MapPin,
  UserMinus,
  Activity,
  Umbrella,
  Timer,
  RefreshCw,
  BarChart3,
  Coffee
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup, query, limit } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  format, 
  addDays, 
  startOfWeek, 
  parseISO, 
  subDays 
} from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const [isAbsenceOpen, setIsAbsenceOpen] = useState(false)
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [isEditShiftOpen, setIsEditOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<any>(null)

  const [newAbsence, setNewAbsence] = useState({
    employeeId: "",
    type: "VACATION",
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: "",
    startTime: "09:00",
    endTime: "13:00",
    reason: ""
  })

  const [newManualShift, setNewManualShift] = useState({
    employeeId: "",
    locationId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "13:00",
    title: "Turno Lavoro",
    type: "MANUAL"
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

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "shifts"), limit(1500));
  }, [db])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "requests"), limit(500));
  }, [db])
  const { data: allRequests } = useCollection(requestsQuery)

  const displayEmployees = useMemo(() => {
    if (!employees) return [];
    const order = ['vittorio', 'isa', 'rosa', 'savino'];
    
    return [...employees]
      .filter(emp => {
        const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
        return !isFrancesco;
      })
      .sort((a, b) => {
        const nameA = (a.firstName || "").toLowerCase();
        const nameB = (b.firstName || "").toLowerCase();
        const indexA = order.findIndex(o => nameA.startsWith(o));
        const indexB = order.findIndex(o => nameB.startsWith(o));
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return nameA.localeCompare(nameB);
      });
  }, [employees]);

  const indexedShifts = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    if (!shifts) return map;
    shifts.forEach(s => {
      const dateKey = s.date;
      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][s.employeeId]) map[dateKey][s.employeeId] = [];
      map[dateKey][s.employeeId].push(s);
    });
    return map;
  }, [shifts]);

  const indexedAbsences = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    if (!allRequests) return map;
    allRequests.forEach(r => {
      const status = (r.status || "").toUpperCase();
      if (status !== "APPROVATO" && status !== "APPROVED" && status !== "Approvato") return;
      const start = r.startDate;
      const end = r.endDate || r.startDate;
      daysOfVisualizedWeek.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        if (dStr >= start && dStr <= end) {
          if (!map[dStr]) map[dStr] = {};
          if (!map[dStr][r.employeeId]) map[dStr][r.employeeId] = [];
          map[dStr][r.employeeId].push(r);
        }
      });
    });
    return map;
  }, [allRequests, daysOfVisualizedWeek]);

  const handleAutoGenerate = async () => {
    toast({ title: "Logica Generazione", description: "La generazione automatica è disabilitata in questa modalità." });
  }

  const handleSaveAbsence = () => {
    if (!newAbsence.employeeId || !newAbsence.startDate) return;
    const id = `abs-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "employees", newAbsence.employeeId, "requests", id), { ...newAbsence, id, status: "Approvato", submittedAt: new Date().toISOString() }, { merge: true });
    setIsAbsenceOpen(false);
    toast({ title: "Assenza Registrata" });
  }

  const handleSaveManualShift = () => {
    if (!newManualShift.employeeId || !newManualShift.date || !newManualShift.locationId) return;
    const id = `shift-man-${Date.now()}`;
    const sObj = new Date(`${newManualShift.date}T${newManualShift.startTime}`);
    const eObj = new Date(`${newManualShift.date}T${newManualShift.endTime}`);
    setDocumentNonBlocking(doc(db, "employees", newManualShift.employeeId, "shifts", id), { 
      id, employeeId: newManualShift.employeeId, locationId: newManualShift.locationId, title: newManualShift.title, date: newManualShift.date, startTime: sObj.toISOString(), endTime: eObj.toISOString(), status: "SCHEDULED", companyId: "default", type: newManualShift.type 
    }, { merge: true });
    setIsShiftOpen(false);
    toast({ title: "Turno Inserito" });
  }

  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setNewManualShift({
      employeeId: shift.employeeId,
      locationId: shift.locationId || "",
      date: shift.date,
      startTime: format(parseISO(shift.startTime), "HH:mm"),
      endTime: format(parseISO(shift.endTime), "HH:mm"),
      title: shift.title || "Turno",
      type: shift.type || "MANUAL"
    });
    setIsEditOpen(true);
  }

  const handleUpdateShift = () => {
    if (!editingShift || !db) return;
    const sObj = new Date(`${newManualShift.date}T${newManualShift.startTime}`);
    const eObj = new Date(`${newManualShift.date}T${newManualShift.endTime}`);
    updateDocumentNonBlocking(doc(db, "employees", editingShift.employeeId, "shifts", editingShift.id), {
      startTime: sObj.toISOString(),
      endTime: eObj.toISOString(),
      title: newManualShift.title,
      locationId: newManualShift.locationId,
      type: newManualShift.type
    });
    setIsEditOpen(false);
    toast({ title: "Turno Aggiornato" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pianificazione Turni</h1>
          <p className="text-sm text-slate-500 font-medium">Visualizzazione fissa: Palese (Sopra), Bisceglie (Sotto).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAbsenceOpen(true)} className="font-bold border-rose-200 text-rose-700 bg-rose-50 h-10 px-4 uppercase text-xs"><UserMinus className="h-4 w-4 mr-2" /> Assenza</Button>
          <Button variant="outline" onClick={handleAutoGenerate} className="font-bold border-blue-200 text-[#227FD8] h-10 px-4 uppercase text-xs"><Sparkles className="h-4 w-4 mr-2" /> Genera</Button>
          <Button onClick={() => setIsShiftOpen(true)} className="bg-[#227FD8] font-black h-10 px-6 uppercase text-xs"><Plus className="h-4 w-4 mr-2" /> Nuovo Turno</Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-5 w-5 text-slate-400" /></Button>
          <div className="text-center min-w-[200px]">
            <span className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-5 w-5 text-slate-400" /></Button>
        </div>
        <Button variant="secondary" className="font-black uppercase px-4 h-8 text-[10px] tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setCurrentDate(new Date())}>Oggi</Button>
      </div>

      <ScrollArea className="w-full h-[750px] border rounded-2xl bg-white shadow-lg">
        <div className="inline-block min-w-full">
          {isEmployeesLoading || isShiftsLoading ? (
            <div className="py-32 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /><p className="mt-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Sincronizzazione Cloud...</p></div>
          ) : (
            <div className="flex flex-col">
              {/* HEADER DIPENDENTI */}
              <div className="flex sticky top-0 z-30 bg-slate-50 border-b shadow-sm">
                <div className="w-[120px] p-4 font-black text-[10px] uppercase text-slate-400 sticky left-0 bg-slate-50 border-r z-40 flex items-center">CALENDARIO</div>
                {displayEmployees.map(emp => (
                  <div key={emp.id} className="min-w-[280px] p-4 border-r flex items-center gap-3 bg-slate-50/80 backdrop-blur-sm">
                    <Avatar className="h-10 w-10 shadow-sm border border-white">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-black text-xs bg-slate-200">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-lg leading-none truncate w-40">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[9px] font-black uppercase text-[#227FD8] tracking-[0.1em] mt-0.5">{emp.locationName}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* GRIGLIA GIORNI */}
              <div className="divide-y divide-slate-100">
                {daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  if (day.getDay() === 0) return null;

                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-50/30 transition-colors">
                      <div className="w-[120px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{format(day, 'EEE', { locale: it })}</div>
                        <div className="text-4xl font-black text-slate-800 tracking-tighter">{format(day, 'dd')}</div>
                      </div>
                      
                      {displayEmployees.map(emp => {
                        const dayShifts = (indexedShifts[dayStr] || {})[emp.id] || [];
                        const dayAbsences = (indexedAbsences[dayStr] || {})[emp.id] || [];
                        
                        // LOGICA VITTORIO MERCOLEDI
                        const isVittorio = (emp.firstName || "").toLowerCase().startsWith("vittorio");
                        const isWednesday = day.getDay() === 3;
                        const forceVittorioRest = isVittorio && isWednesday;

                        const isRestDay = String(day.getDay()) === String(emp.restDay);

                        const checkIsBisceglie = (item: any) => {
                          const locId = item.locationId || "";
                          const locName = locations?.find(l => l.id === locId)?.name || "";
                          return locName.toUpperCase().includes("BISCEGLIE");
                        };

                        // Se un dipendente non ha sede specificata, lo mettiamo di default sopra (Palese)
                        const empDefaultBisceglie = (emp.locationName || "").toUpperCase().includes("BISCEGLIE");

                        const paleseShifts = dayShifts.filter(s => !checkIsBisceglie(s));
                        const bisceglieShifts = dayShifts.filter(s => checkIsBisceglie(s));
                        const paleseAbsences = dayAbsences.filter(a => !checkIsBisceglie(a));
                        const bisceglieAbsences = dayAbsences.filter(a => checkIsBisceglie(a));

                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[280px] border-r flex flex-col bg-white">
                            {/* SLOT SUPERIORE (PALESE) */}
                            <div className="p-2 min-h-[140px] flex flex-col gap-2 bg-blue-50/5 border-b border-dashed border-slate-100">
                              <div className="flex items-center justify-between opacity-30">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#227FD8]">PALESE</span>
                              </div>
                              {paleseAbsences.map(a => <AbsenceItem key={a.id} a={a} />)}
                              {paleseShifts.map(s => <ShiftItem key={s.id} s={s} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />)}
                              
                              {/* RIPOSO MANUALE VITTORIO */}
                              {forceVittorioRest && paleseShifts.length === 0 && paleseAbsences.length === 0 && (
                                <RestItem start="09:00" end="13:00" />
                              )}
                              {/* RIPOSO ANAGRAFICA */}
                              {isRestDay && !forceVittorioRest && !empDefaultBisceglie && paleseShifts.length === 0 && paleseAbsences.length === 0 && (
                                <RestItem start={emp.restStartTime} end={emp.restEndTime} />
                              )}
                            </div>

                            {/* SLOT INFERIORE (BISCEGLIE) */}
                            <div className="p-2 min-h-[140px] flex flex-col gap-2 bg-emerald-50/5">
                              <div className="flex items-center justify-between opacity-30">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">BISCEGLIE</span>
                              </div>
                              {bisceglieAbsences.map(a => <AbsenceItem key={a.id} a={a} />)}
                              {bisceglieShifts.map(s => <ShiftItem key={s.id} s={s} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />)}
                              
                              {isRestDay && empDefaultBisceglie && bisceglieShifts.length === 0 && bisceglieAbsences.length === 0 && (
                                <RestItem start={emp.restStartTime} end={emp.restEndTime} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* DIALOGS */}
      <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase">Nuovo Turno</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500">Collaboratore</Label>
              <Select value={newManualShift.employeeId} onValueChange={v => setNewManualShift({...newManualShift, employeeId: v})}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500">Sede</Label>
                <Select value={newManualShift.locationId} onValueChange={v => setNewManualShift({...newManualShift, locationId: v})}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Sede..." /></SelectTrigger>
                  <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500">Tipo</Label>
                <Select value={newManualShift.type} onValueChange={v => setNewManualShift({...newManualShift, type: v})}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="MANUAL">Lavoro</SelectItem><SelectItem value="REST">Riposo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="font-black text-[10px] uppercase text-slate-500">Inizio</Label><Input type="time" className="h-10" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} /></div>
              <div className="space-y-1"><Label className="font-black text-[10px] uppercase text-slate-500">Fine</Label><Input type="time" className="h-10" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveManualShift} className="bg-[#227FD8] font-black w-full h-12 uppercase tracking-widest shadow-md text-sm">SALVA RECORD</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase text-rose-600">Registra Assenza</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500">Dipendente</Label>
              <Select value={newAbsence.employeeId} onValueChange={v => setNewAbsence({...newAbsence, employeeId: v})}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="font-black text-[10px] uppercase text-slate-500">Giorno</Label><Input type="date" className="h-10" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} /></div>
              <div className="space-y-1"><Label className="font-black text-[10px] uppercase text-slate-500">Tipo</Label>
                <Select value={newAbsence.type} onValueChange={v => setNewAbsence({...newAbsence, type: v})}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="VACATION">Ferie</SelectItem><SelectItem value="SICK">Malattia</SelectItem><SelectItem value="PERSONAL">Permesso</SelectItem><SelectItem value="HOURLY_PERMIT">Permesso Orario</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveAbsence} className="bg-rose-600 font-black w-full h-12 uppercase tracking-widest shadow-md text-sm">CONFERMA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShiftItem({ s, onEdit, onDelete }: { s: any, onEdit: () => void, onDelete: () => void }) {
  const start = format(parseISO(s.startTime), 'HH:mm');
  const end = format(parseISO(s.endTime), 'HH:mm');
  const isMorning = parseISO(s.startTime).getHours() < 14;
  if (s.type === 'REST') return <RestItem start={start} end={end} />;

  return (
    <div className={cn("group/item relative p-3 rounded-lg border-l-4 shadow-sm transition-all bg-white w-full", isMorning ? "border-amber-400" : "border-indigo-500")}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-black text-slate-800">
            {isMorning ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
            {start} - {end}
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.title || 'Turno Lavoro'}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-slate-50 rounded"><Edit className="h-3 w-3 text-slate-400" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-rose-50 rounded text-rose-500"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  )
}

function AbsenceItem({ a }: { a: any }) {
  const timeStr = a.type === 'HOURLY_PERMIT' && a.startTime && a.endTime ? `${a.startTime} - ${a.endTime}` : "Intera Giornata";
  return (
    <div className="p-3 rounded-lg border-l-4 border-rose-600 shadow-sm bg-rose-50 w-full">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-sm font-black text-rose-900">
          <Umbrella className="h-3.5 w-3.5" />
          {timeStr}
        </div>
        <span className="text-[9px] font-black uppercase text-rose-600 tracking-widest mt-0.5">{a.type === 'VACATION' ? 'FERIE' : 'ASSENZA'}</span>
      </div>
    </div>
  )
}

function RestItem({ start, end }: { start?: string, end?: string }) {
  const timeStr = start && end && start !== "00:00" ? `${start} - ${end}` : "Intera Giornata";
  return (
    <div className="p-3 rounded-lg border-l-4 border-slate-400 shadow-sm bg-slate-100 w-full">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-sm font-black text-slate-600">
          <Coffee className="h-3.5 w-3.5" />
          {timeStr}
        </div>
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">RIPOSO SETTIMANALE</span>
      </div>
    </div>
  )
}
