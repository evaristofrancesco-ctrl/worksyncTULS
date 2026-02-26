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
  Coffee,
  Umbrella,
  Wand2
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
  subDays,
  isSameDay
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
import { aiShiftOptimization } from "@/ai/flows/ai-shift-optimization-flow"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [form, setForm] = useState({
    id: "",
    employeeId: "",
    locationId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "13:00",
    title: "Turno Lavoro",
    type: "MANUAL"
  })

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
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
    return query(collectionGroup(db, "shifts"), limit(1500));
  }, [db])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  const displayEmployees = useMemo(() => {
    if (!employees) return [];
    const order = ['vittorio', 'isa', 'rosa', 'savino'];
    return [...employees]
      .filter(emp => !(emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo'))
      .sort((a, b) => {
        const nameA = (a.firstName || "").toLowerCase();
        const nameB = (b.firstName || "").toLowerCase();
        const idxA = order.findIndex(o => nameA.startsWith(o));
        const idxB = order.findIndex(o => nameB.startsWith(o));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return nameA.localeCompare(nameB);
      });
  }, [employees]);

  const indexedEvents = useMemo(() => {
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

  const handleOpenAdd = (employeeId: string, date: string, locId?: string) => {
    setForm({
      id: "",
      employeeId,
      locationId: locId || employees?.find(e => e.id === employeeId)?.locationId || "",
      date,
      startTime: "09:00",
      endTime: "13:00",
      title: "Turno Lavoro",
      type: "MANUAL"
    });
    setIsShiftOpen(true);
  }

  const handleSave = () => {
    if (!form.employeeId || !form.date) return;
    const id = form.id || `shift-${Date.now()}`;
    const sObj = new Date(`${form.date}T${form.startTime}`);
    const eObj = new Date(`${form.date}T${form.endTime}`);
    
    setDocumentNonBlocking(doc(db, "employees", form.employeeId, "shifts", id), {
      ...form,
      id,
      startTime: sObj.toISOString(),
      endTime: eObj.toISOString(),
      companyId: "default",
      status: "SCHEDULED"
    }, { merge: true });

    setIsShiftOpen(false);
    setIsEditOpen(false);
    toast({ title: form.id ? "Aggiornato" : "Creato" });
  }

  const handleEdit = (event: any) => {
    setForm({
      id: event.id,
      employeeId: event.employeeId,
      locationId: event.locationId || "",
      date: event.date,
      startTime: format(parseISO(event.startTime), "HH:mm"),
      endTime: format(parseISO(event.endTime), "HH:mm"),
      title: event.title || "Turno",
      type: event.type || "MANUAL"
    });
    setIsEditOpen(true);
  }

  const handleGenerateAI = async () => {
    if (!employees || !locations || employees.length === 0) return;
    
    setIsGenerating(true);
    toast({ title: "Aggiornamento Settimana", description: "Rimozione turni precedenti e ottimizzazione in corso..." });
    
    try {
      // 1. CANCELLAZIONE TURNI ESISTENTI NELLA SETTIMANA
      const weekShifts = shifts?.filter(s => {
        const d = parseISO(s.date);
        return d >= weekStart && d <= weekEnd;
      }) || [];

      weekShifts.forEach(s => {
        deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id));
      });

      // 2. PREPARAZIONE SLOT SEMPLIFICATI (Solo Mattina e Pomeriggio senza distinzione sede)
      const slotsToCover: any[] = [];
      daysOfVisualizedWeek.forEach(day => {
        if (day.getDay() === 0) return; // Salta Domenica
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // Creiamo 2 slot per mattina e 2 per pomeriggio (copertura base)
        for (let i = 1; i <= 2; i++) {
          slotsToCover.push({ id: `am-${dayStr}-${i}`, name: 'Mattina', startTime: `${dayStr}T09:00:00Z`, endTime: `${dayStr}T13:00:00Z` });
          slotsToCover.push({ id: `pm-${dayStr}-${i}`, name: 'Pomeriggio', startTime: `${dayStr}T17:00:00Z`, endTime: `${dayStr}T20:20:00Z` });
        }
      });

      const aiInput = {
        employees: displayEmployees.map(e => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          availability: `Riposo il giorno ${e.restDay} (0=Dom, 1=Lun...).`
        })),
        shifts: slotsToCover
      };

      const result = await aiShiftOptimization(aiInput);

      // 3. SALVATAGGIO (Tutti nello slot superiore PALESE come default)
      const paleseId = locations.find(l => l.name.toLowerCase().includes('palese'))?.id || "default-palese";

      result.optimizedAssignments.forEach((asn, idx) => {
        const targetSlot = slotsToCover.find(s => s.id === asn.shiftId);
        if (!targetSlot) return;

        const id = `ai-${Date.now()}-${idx}`;
        setDocumentNonBlocking(doc(db, "employees", asn.employeeId, "shifts", id), {
          id,
          employeeId: asn.employeeId,
          locationId: paleseId,
          date: targetSlot.startTime.split('T')[0],
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
          title: targetSlot.name,
          type: "MANUAL",
          companyId: "default",
          status: "SCHEDULED"
        }, { merge: true });
      });

      toast({ title: "Generazione Completata", description: "I turni sono stati inseriti nello slot Palese. Spostali se necessario." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile completare l'operazione." });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Programmazione Settimanale</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-70">Gestione Centralizzata Badge</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleGenerateAI} 
            disabled={isGenerating}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest shadow-lg gap-2 h-11 px-6"
          >
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            GENERA TURNI AI
          </Button>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border ring-1 ring-slate-200">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-[10px] font-black uppercase tracking-tighter min-w-[120px] text-center">
              {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <ScrollArea className="w-full h-[750px] border rounded-2xl bg-white shadow-2xl">
        <div className="inline-block min-w-full">
          {isEmployeesLoading || isShiftsLoading ? (
            <div className="py-32 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
          ) : (
            <div className="flex flex-col">
              <div className="flex sticky top-0 z-30 bg-slate-50 border-b shadow-sm">
                <div className="w-[80px] p-4 font-black text-[9px] uppercase text-slate-400 sticky left-0 bg-slate-50 border-r z-40 flex items-center justify-center text-center">DATA</div>
                {displayEmployees.map(emp => (
                  <div key={emp.id} className="min-w-[260px] p-4 border-r flex items-center gap-3 bg-slate-50/90 backdrop-blur-sm">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-black text-xs bg-slate-200">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-base leading-none uppercase tracking-tight">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[8px] font-black uppercase text-[#227FD8] tracking-widest mt-1 opacity-70">REPARTO: {emp.jobTitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100">
                {daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  if (day.getDay() === 0) return null;

                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-50/20 transition-colors">
                      <div className="w-[80px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">{format(day, 'EEE', { locale: it })}</div>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter">{format(day, 'dd')}</div>
                      </div>
                      
                      {displayEmployees.map(emp => {
                        const dayEvents = (indexedEvents[dayStr] || {})[emp.id] || [];
                        const isVittorio = emp.firstName?.toLowerCase() === 'vittorio';
                        
                        const slot1Events = dayEvents.filter(ev => {
                          const locName = locations?.find(l => l.id === ev.locationId)?.name || "";
                          return !locName.toLowerCase().includes('bisceglie');
                        });
                        const slot2Events = dayEvents.filter(ev => {
                          const locName = locations?.find(l => l.id === ev.locationId)?.name || "";
                          return locName.toLowerCase().includes('bisceglie');
                        });

                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[260px] border-r bg-white flex flex-col p-1.5 gap-1.5">
                            {/* SLOT 1 - PALESE (DEFAULT GENERAZIONE) */}
                            <div className="flex-1 min-h-[90px] border rounded-xl border-dashed border-slate-100 p-1 relative group/slot">
                              <div className="absolute top-1 right-1 text-[7px] font-black text-slate-200 uppercase tracking-widest pointer-events-none">PALESE</div>
                              <div className="flex flex-col gap-1.5 relative z-10">
                                {isVittorio && day.getDay() === 3 && slot1Events.length === 0 ? (
                                  <div className="p-3 rounded-lg border-l-[4px] border-l-slate-400 bg-slate-50 text-slate-600 shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">RIPOSO</span>
                                      <Coffee className="h-3 w-3" />
                                    </div>
                                    <div className="text-[10px] font-black tracking-tight">09:00 - 13:00</div>
                                    <div className="text-[8px] font-bold uppercase truncate">Riposo Vittorio</div>
                                  </div>
                                ) : slot1Events.map(ev => (
                                  <EventBadge key={ev.id} ev={ev} onEdit={() => handleEdit(ev)} />
                                ))}
                                <button 
                                  onClick={() => handleOpenAdd(emp.id, dayStr, locations?.find(l => l.name.toLowerCase().includes('palese'))?.id)}
                                  className="w-full py-2 rounded-lg border-2 border-dashed border-slate-50 text-slate-200 opacity-0 group-hover/slot:opacity-100 hover:border-blue-100 hover:text-blue-300 transition-all flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* SLOT 2 - BISCEGLIE */}
                            <div className="flex-1 min-h-[90px] border rounded-xl border-dashed border-slate-100 p-1 relative group/slot2">
                              <div className="absolute top-1 right-1 text-[7px] font-black text-slate-200 uppercase tracking-widest pointer-events-none">BISCEGLIE</div>
                              <div className="flex flex-col gap-1.5 relative z-10">
                                {slot2Events.map(ev => (
                                  <EventBadge key={ev.id} ev={ev} onEdit={() => handleEdit(ev)} />
                                ))}
                                <button 
                                  onClick={() => handleOpenAdd(emp.id, dayStr, locations?.find(l => l.name.toLowerCase().includes('bisceglie'))?.id)}
                                  className="w-full py-2 rounded-lg border-2 border-dashed border-slate-50 text-slate-200 opacity-0 group-hover/slot2:opacity-100 hover:border-blue-100 hover:text-blue-300 transition-all flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
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

      <Dialog open={isShiftOpen || isEditOpen} onOpenChange={(o) => { if(!o) { setIsShiftOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase tracking-tighter">{form.id ? "Modifica" : "Nuovo"} Badge Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Tipo di Badge</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Turno Lavoro (Colorato)</SelectItem>
                  <SelectItem value="REST">Riposo Settimanale (Grigio)</SelectItem>
                  <SelectItem value="ABSENCE">Assenza/Ferie (Rosso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Etichetta Badge</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="es. Mattina, Pomeriggio..." className="h-11 font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Inizio</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="h-11 font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Fine</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="h-11 font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Sede Assegnata</Label>
              <Select value={form.locationId} onValueChange={v => setForm({...form, locationId: v})}>
                <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Sede..." /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {form.id && (
              <Button variant="ghost" onClick={() => { deleteDocumentNonBlocking(doc(db, "employees", form.employeeId, "shifts", form.id)); setIsEditOpen(false); }} className="text-rose-600 font-bold">ELIMINA</Button>
            )}
            <Button onClick={handleSave} className="bg-[#227FD8] font-black flex-1 h-12 uppercase tracking-widest shadow-lg">SALVA MODIFICHE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventBadge({ ev, onEdit }: { ev: any, onEdit: () => void }) {
  const start = ev.startTime ? format(parseISO(ev.startTime), 'HH:mm') : "00:00";
  const end = ev.endTime ? format(parseISO(ev.endTime), 'HH:mm') : "00:00";
  const isMorning = ev.startTime ? parseISO(ev.startTime).getHours() < 14 : true;

  let colorClass = "border-l-[#227FD8] bg-blue-50/30 text-blue-900";
  let icon = <Sun className="h-3 w-3 text-blue-500" />;

  if (ev.type === 'REST') {
    colorClass = "border-l-slate-400 bg-slate-100 text-slate-600";
    icon = <Coffee className="h-3 w-3 text-slate-400" />;
  } else if (ev.type === 'ABSENCE') {
    colorClass = "border-l-rose-600 bg-rose-50 text-rose-900";
    icon = <Umbrella className="h-3 w-3 text-rose-600" />;
  } else if (!isMorning) {
    colorClass = "border-l-indigo-600 bg-indigo-50/30 text-indigo-900";
    icon = <Moon className="h-3 w-3 text-indigo-600" />;
  } else {
    colorClass = "border-l-amber-500 bg-amber-50/30 text-amber-900";
    icon = <Sun className="h-3 w-3 text-amber-500" />;
  }

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className={cn(
        "group relative p-2 rounded-lg border-l-[4px] shadow-sm cursor-pointer hover:shadow-md transition-all w-full",
        colorClass
      )}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
            {ev.type === 'REST' ? 'RIPOSO' : ev.type === 'ABSENCE' ? 'ASSENZA' : 'LAVORO'}
          </span>
          {icon}
        </div>
        <div className="text-[9px] font-black tracking-tight">{start} - {end}</div>
        <div className="text-[8px] font-bold uppercase truncate">{ev.title || 'Turno'}</div>
      </div>
    </div>
  )
}
