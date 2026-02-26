
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

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "shifts"), limit(1000));
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
    
    return employees
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
      if (!map[s.date]) map[s.date] = {};
      if (!map[s.date][s.employeeId]) map[s.date][s.employeeId] = [];
      map[s.date][s.employeeId].push(s);
    });
    return map;
  }, [shifts]);

  const indexedAbsences = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    if (!allRequests) return map;
    allRequests.forEach(r => {
      const status = (r.status || "").toUpperCase();
      if (status !== "APPROVATO" && status !== "APPROVED" && status !== "Approvato") return;
      daysOfVisualizedWeek.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (dateStr >= r.startDate && dateStr <= (r.endDate || r.startDate)) {
          if (!map[dateStr]) map[dateStr] = {};
          if (!map[dateStr][r.employeeId]) map[dateStr][r.employeeId] = [];
          map[dateStr][r.employeeId].push(r);
        }
      });
    });
    return map;
  }, [allRequests, daysOfVisualizedWeek]);

  const dailyLocationCounts = useMemo(() => {
    const counts: Record<string, Record<string, { morning: number, afternoon: number }>> = {};
    daysOfVisualizedWeek.forEach(day => {
      const dStr = format(day, 'yyyy-MM-dd');
      counts[dStr] = {};
      locations?.forEach(loc => {
        let morning = 0;
        let afternoon = 0;
        const dayShiftsMap = indexedShifts[dStr] || {};
        Object.keys(dayShiftsMap).forEach(empId => {
          const abs = (indexedAbsences[dStr] || {})[empId] || [];
          const isFullyAbsent = abs.some(a => a.type !== 'HOURLY_PERMIT');
          if (isFullyAbsent) return;
          dayShiftsMap[empId].forEach(s => {
            if (s.locationId === loc.id) {
              const hour = parseISO(s.startTime).getHours();
              if (hour < 14) morning++;
              else afternoon++;
            }
          });
        });
        counts[dStr][loc.id] = { morning, afternoon };
      });
    });
    return counts;
  }, [daysOfVisualizedWeek, locations, indexedShifts, indexedAbsences]);

  const handleAutoGenerate = async () => {
    if (!displayEmployees || displayEmployees.length === 0) return;
    setIsGenerating(true);
    try {
      for (const emp of displayEmployees) {
        if (!emp.isActive) continue;
        const isSavino = emp.firstName?.toLowerCase().includes('savino') || emp.lastName?.toLowerCase().includes('savino');
        for (let i = 0; i < 6; i++) {
          const targetDay = addDays(weekStart, i);
          const dateStr = format(targetDay, 'yyyy-MM-dd');
          const dayIdx = targetDay.getDay();
          
          if (isSavino) {
            let amEndHour = 10;
            let amEndMin = 0;
            if (dayIdx === 4) amEndHour = 13;
            else if (dayIdx === 6) { amEndHour = 11; amEndMin = 0; }

            const sAM = new Date(targetDay); sAM.setHours(9, 0, 0);
            const eAM = new Date(targetDay); eAM.setHours(amEndHour, amEndMin, 0);
            const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
              id: idAM, employeeId: emp.id, locationId: emp.locationId || "default", title: "Turno Mattina", date: dateStr, startTime: sAM.toISOString(), endTime: eAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING", type: "AUTO"
            }, { merge: true });

            const sPM = new Date(targetDay); sPM.setHours(17, 0, 0);
            const ePM = new Date(targetDay); ePM.setHours(20, 20, 0);
            const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
              id: idPM, employeeId: emp.id, locationId: emp.locationId || "default", title: "Turno Pomeriggio", date: dateStr, startTime: sPM.toISOString(), endTime: ePM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO"
            }, { merge: true });
          }
        }
      }
      toast({ title: "Settimana Rigenerata" });
    } finally { setIsGenerating(false); }
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
      id, employeeId: newManualShift.employeeId, locationId: newManualShift.locationId, title: newManualShift.title, date: newManualShift.date, startTime: sObj.toISOString(), endTime: eObj.toISOString(), status: "SCHEDULED", companyId: "default", slot: sObj.getHours() < 14 ? "MORNING" : "AFTERNOON", type: "MANUAL" 
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
      title: shift.title || "Turno"
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
      type: "MANUAL"
    });
    setIsEditOpen(false);
    toast({ title: "Turno Aggiornato" });
  }

  const paleseLoc = locations?.find(l => l.name.toUpperCase().includes("PALESE"));
  const bisceglieLoc = locations?.find(l => l.name.toUpperCase().includes("BISCEGLIE"));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Pianificazione Turni</h1>
          <p className="text-lg text-slate-500 font-medium">Visualizzazione a doppio slot (Palese/Bisceglie) ottimizzata.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAbsenceOpen(true)} className="font-bold border-amber-200 text-amber-700 bg-amber-50 h-12 px-6 uppercase"><UserMinus className="h-5 w-5 mr-2" /> Assenza</Button>
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="font-bold border-blue-200 text-[#227FD8] h-12 px-6 uppercase">{isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />} Genera</Button>
          <Button onClick={() => setIsShiftOpen(true)} className="bg-[#227FD8] font-black h-12 px-8 shadow-lg uppercase"><Plus className="h-5 w-5 mr-2" /> Nuovo Turno</Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border ring-1 ring-slate-100">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-6 w-6" /></Button>
          <div className="text-center min-w-[250px]">
            <span className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-6 w-6" /></Button>
        </div>
        <Button variant="secondary" className="font-black uppercase px-6 h-10 tracking-widest" onClick={() => setCurrentDate(new Date())}>Oggi</Button>
      </div>

      <ScrollArea className="w-full h-[850px] border rounded-3xl bg-white shadow-md">
        <div className="inline-block min-w-full">
          {isEmployeesLoading || isShiftsLoading ? (
            <div className="py-32 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8]" /><p className="mt-4 font-bold text-slate-400">Caricamento dati...</p></div>
          ) : (
            <div className="flex flex-col">
              <div className="flex sticky top-0 z-30 bg-slate-50 border-b shadow-sm">
                <div className="w-[200px] p-5 font-black text-xs uppercase text-slate-400 sticky left-0 bg-slate-50 border-r z-40">DATA</div>
                {displayEmployees.map(emp => (
                  <div key={emp.id} className="min-w-[260px] p-5 border-r flex items-center gap-4 bg-slate-50/50">
                    <Avatar className="h-12 w-12 shadow-md ring-2 ring-white">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-black text-lg">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-lg leading-tight truncate w-32">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{emp.locationName}</span>
                    </div>
                  </div>
                ))}
                <div className="min-w-[280px] p-5 bg-slate-100/80 flex items-center gap-3 border-l-2 border-slate-300">
                  <BarChart3 className="h-6 w-6 text-slate-600" />
                  <span className="font-black text-xs uppercase text-slate-600 tracking-widest">Copertura Sedi</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  if (day.getDay() === 0) return null;

                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-50/10 transition-colors">
                      <div className="w-[200px] p-5 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center">
                        <div className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">{format(day, 'EEEE', { locale: it })}</div>
                        <div className="text-5xl font-black text-slate-800 tracking-tighter">{format(day, 'dd')}</div>
                      </div>
                      
                      {displayEmployees.map(emp => {
                        const dayShifts = (indexedShifts[dayStr] || {})[emp.id] || [];
                        const dayAbsences = (indexedAbsences[dayStr] || {})[emp.id] || [];
                        const isRestDay = day.getDay().toString() === emp.restDay;

                        // Filtraggio eventi per sede con fallback sulla sede principale del dipendente se il turno è generico
                        const paleseEvents = dayShifts.filter(s => 
                          s.locationId === paleseLoc?.id || 
                          ((!s.locationId || s.locationId === 'default') && emp.locationId === paleseLoc?.id)
                        );
                        const bisceglieEvents = dayShifts.filter(s => 
                          s.locationId === bisceglieLoc?.id || 
                          ((!s.locationId || s.locationId === 'default') && emp.locationId === bisceglieLoc?.id)
                        );
                        
                        const paleseAbsences = dayAbsences.filter(a => !a.locationId || a.locationId === paleseLoc?.id);
                        const bisceglieAbsences = dayAbsences.filter(a => a.locationId === bisceglieLoc?.id);

                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[260px] border-r flex flex-col bg-white">
                            {/* SLOT FISSO PALESE */}
                            <div className="p-3 min-h-[110px] flex flex-col gap-1.5 bg-blue-50/10 border-b border-dashed border-slate-100 relative group/slot">
                              <div className="flex items-center justify-between opacity-30 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#227FD8]">PALESE</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {paleseAbsences.map(a => <AbsenceItem key={`p-abs-${a.id}`} a={a} />)}
                                {paleseEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                                  <ShiftItem key={s.id} s={s} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />
                                ))}
                                {isRestDay && emp.locationId === paleseLoc?.id && paleseEvents.length === 0 && paleseAbsences.length === 0 && (
                                  <RestItem start={emp.restStartTime} end={emp.restEndTime} />
                                )}
                              </div>
                            </div>

                            {/* SLOT FISSO BISCEGLIE */}
                            <div className="p-3 min-h-[110px] flex flex-col gap-1.5 bg-emerald-50/10 relative group/slot">
                              <div className="flex items-center justify-between opacity-30 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">BISCEGLIE</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {bisceglieAbsences.map(a => <AbsenceItem key={`b-abs-${a.id}`} a={a} />)}
                                {bisceglieEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                                  <ShiftItem key={s.id} s={s} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />
                                ))}
                                {isRestDay && emp.locationId === bisceglieLoc?.id && bisceglieEvents.length === 0 && bisceglieAbsences.length === 0 && (
                                  <RestItem start={emp.restStartTime} end={emp.restEndTime} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="min-w-[280px] p-4 border-l-2 border-slate-300 bg-slate-50/50 flex flex-col gap-3 justify-center">
                        {locations?.map(loc => {
                          const counts = dailyLocationCounts[dayStr]?.[loc.id] || { morning: 0, afternoon: 0 };
                          const isWarning = counts.morning === 0 || counts.afternoon === 0;
                          return (
                            <div key={loc.id} className={cn("p-3 rounded-2xl bg-white border shadow-md space-y-2", isWarning && "ring-2 ring-rose-200 animate-pulse")}>
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className={cn("h-5 w-5", isWarning ? "text-rose-500" : "text-slate-400")} />
                                <span className="font-black text-[11px] uppercase text-slate-600 truncate">{loc.name}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-black">
                                <span className="text-slate-400">MATTINA:</span>
                                <Badge className={cn("h-7 px-3 font-black text-xs", counts.morning > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>{counts.morning}</Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs font-black">
                                <span className="text-slate-400">POMERIGGIO:</span>
                                <Badge className={cn("h-7 px-3 font-black text-xs", counts.afternoon > 0 ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700")}>{counts.afternoon}</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-2xl uppercase tracking-tight">Nuovo Turno Manuale</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500">Collaboratore</Label>
              <Select value={newManualShift.employeeId} onValueChange={v => setNewManualShift({...newManualShift, employeeId: v})}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500">Sede</Label>
              <Select value={newManualShift.locationId} onValueChange={v => setNewManualShift({...newManualShift, locationId: v})}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Seleziona Sede..." /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-black text-xs uppercase text-slate-500">Inizio</Label><Input type="time" className="h-12 text-lg" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-black text-xs uppercase text-slate-500">Fine</Label><Input type="time" className="h-12 text-lg" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveManualShift} className="bg-[#227FD8] font-black w-full h-14 uppercase tracking-widest shadow-xl text-lg">SALVA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditShiftOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-2xl uppercase tracking-tight">Modifica Turno</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500">Sede</Label>
              <Select value={newManualShift.locationId} onValueChange={v => setNewManualShift({...newManualShift, locationId: v})}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" className="h-12 text-lg" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
              <Input type="time" className="h-12 text-lg" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateShift} className="bg-[#227FD8] font-black w-full h-14 uppercase tracking-widest shadow-xl text-lg">AGGIORNA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-2xl uppercase tracking-tight text-rose-600">Registra Assenza</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500">Dipendente</Label>
              <Select value={newAbsence.employeeId} onValueChange={v => setNewAbsence({...newAbsence, employeeId: v})}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-black text-xs uppercase text-slate-500">Giorno</Label><Input type="date" className="h-12 text-base" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-black text-xs uppercase text-slate-500">Tipo</Label>
                <Select value={newAbsence.type} onValueChange={v => setNewAbsence({...newAbsence, type: v})}>
                  <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="VACATION">Ferie</SelectItem><SelectItem value="SICK">Malattia</SelectItem><SelectItem value="PERSONAL">Permesso</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveAbsence} className="bg-rose-600 font-black w-full h-14 uppercase tracking-widest shadow-xl text-lg">CONFERMA ASSENZA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShiftItem({ s, onEdit, onDelete }: { s: any, onEdit: () => void, onDelete: () => void }) {
  const start = format(parseISO(s.startTime), 'HH:mm');
  const end = format(parseISO(s.endTime), 'HH:mm');
  const isMorning = parseISO(s.startTime).getHours() < 14;
  
  return (
    <div className={cn("group/item relative p-2.5 rounded-lg border-l-4 shadow-sm transition-all hover:scale-[1.02] bg-white", isMorning ? "border-amber-400 text-amber-900" : "border-indigo-400 text-indigo-900")}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-tight">
            {isMorning ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            {start} - {end}
          </div>
          {s.title && s.title !== 'Turno Mattina' && s.title !== 'Turno Pomeriggio' && (
            <span className="text-[10px] font-black text-slate-400 truncate w-40 uppercase tracking-tighter">{s.title}</span>
          )}
        </div>
        <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-black/5 rounded"><Edit className="h-4 w-4" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-rose-500/10 rounded text-rose-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}

function AbsenceItem({ a }: { a: any }) {
  const getIcon = () => {
    switch(a.type) {
      case 'VACATION': return <Umbrella className="h-4 w-4" />;
      case 'SICK': return <Activity className="h-4 w-4" />;
      case 'HOURLY_PERMIT': return <Timer className="h-4 w-4" />;
      default: return <UserMinus className="h-4 w-4" />;
    }
  }
  const timeStr = a.type === 'HOURLY_PERMIT' && a.startTime && a.endTime 
    ? `${a.startTime} - ${a.endTime}` 
    : "Intera Giornata";

  return (
    <div className="p-2.5 rounded-lg border-l-4 border-rose-600 shadow-sm bg-rose-50 text-rose-900">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-tight">
          {getIcon()}
          {timeStr}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{a.type}</span>
      </div>
    </div>
  )
}

function RestItem({ start, end }: { start?: string, end?: string }) {
  const timeStr = start && end && start !== "00:00" ? `${start} - ${end}` : "Intera Giornata";
  return (
    <div className="p-2.5 rounded-lg border-l-4 border-slate-400 shadow-sm bg-slate-50 text-slate-600">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-tight">
          <Coffee className="h-4 w-4 text-slate-400" />
          {timeStr}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">RIPOSO SETTIMANALE</span>
      </div>
    </div>
  )
}
