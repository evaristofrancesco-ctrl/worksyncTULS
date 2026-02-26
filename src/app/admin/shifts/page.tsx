
"use client"

import { useState, useMemo } from "react"
import { 
  Plus, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  Clock,
  Sun,
  Moon,
  Coffee,
  Umbrella,
  CalendarDays,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup, query, limit } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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

  // Logica Settimana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const daysOfVisualizedWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Dati da Firestore
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

  // ORDINE FISSO RICHIESTO: Vittorio, Isa, Rosa, Savino
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

  // Indicizzazione turni
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
    toast({ title: form.id ? "Modifiche salvate" : "Turno creato" });
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
    toast({ title: "Generazione Iniziata", description: "Applicazione regole Vittorio e ottimizzazione team..." });
    
    try {
      const weekShifts = shifts?.filter(s => {
        const d = parseISO(s.date);
        return d >= weekStart && d <= weekEnd;
      }) || [];

      // 1. Pulizia Settimana
      for (const s of weekShifts) {
        deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id));
      }

      const paleseId = locations.find(l => l.name.toLowerCase().includes('palese'))?.id || "palese-id";

      // 2. REGOLE FISSE VITTORIO (Richiesta Utente)
      const vittorio = displayEmployees.find(e => e.firstName?.toLowerCase().includes('vittorio'));
      if (vittorio) {
        daysOfVisualizedWeek.forEach((day) => {
          const dayOfWeek = day.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
          if (dayOfWeek === 0) return; // No Domenica

          const dStr = format(day, 'yyyy-MM-dd');
          
          // Mattina (Mercoledì Riposo, gli altri lavoro)
          const amId = `vitt-am-${dStr}`;
          const isWedRest = dayOfWeek === 3;
          
          setDocumentNonBlocking(doc(db, "employees", vittorio.id, "shifts", amId), {
            id: amId,
            employeeId: vittorio.id,
            locationId: paleseId,
            date: dStr,
            startTime: `${dStr}T09:00:00Z`,
            endTime: `${dStr}T13:00:00Z`,
            title: isWedRest ? "Riposo Settimanale" : "Mattina",
            type: isWedRest ? "REST" : "MANUAL",
            companyId: "default",
            status: "SCHEDULED"
          }, { merge: true });

          // Pomeriggio (Sempre lavoro Lun-Sab)
          const pmId = `vitt-pm-${dStr}`;
          setDocumentNonBlocking(doc(db, "employees", vittorio.id, "shifts", pmId), {
            id: pmId,
            employeeId: vittorio.id,
            locationId: paleseId,
            date: dStr,
            startTime: `${dStr}T17:00:00Z`,
            endTime: `${dStr}T20:20:00Z`,
            title: "Pomeriggio",
            type: "MANUAL",
            companyId: "default",
            status: "SCHEDULED"
          }, { merge: true });
        });
      }

      // 3. GENERAZIONE AI PER GLI ALTRI
      const otherEmployees = displayEmployees.filter(e => !e.firstName?.toLowerCase().includes('vittorio'));
      if (otherEmployees.length > 0) {
        const slotsToCover: any[] = [];
        daysOfVisualizedWeek.forEach(day => {
          if (day.getDay() === 0) return;
          const dStr = format(day, 'yyyy-MM-dd');
          slotsToCover.push({ id: `am-${dStr}`, name: 'Mattina', startTime: `${dStr}T09:00:00Z`, endTime: `${dStr}T13:00:00Z` });
          slotsToCover.push({ id: `pm-${dStr}`, name: 'Pomeriggio', startTime: `${dStr}T17:00:00Z`, endTime: `${dStr}T20:20:00Z` });
        });

        const aiInput = {
          employees: otherEmployees.map(e => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            availability: e.restDay || "0"
          })),
          shifts: slotsToCover
        };

        const result = await aiShiftOptimization(aiInput);

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
      }

      toast({ title: "Completato", description: "Programma settimanale aggiornato correttamente." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore Generazione" });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-black text-slate-900 tracking-tighter uppercase leading-none">Pianificazione Turni</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-2">
            <CalendarDays className="h-5 w-5 text-[#227FD8]" /> Monitoraggio Copertura Sedi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleGenerateAI} 
            disabled={isGenerating}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest shadow-lg h-12 px-8"
          >
            {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 mr-2" />}
            GENERA TURNI AI
          </Button>
          
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border ring-1 ring-slate-200">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-5 w-5" /></Button>
            <span className="text-sm font-black uppercase min-w-[160px] text-center text-slate-600">
              {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
            </span>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </div>
      </div>

      <ScrollArea className="w-full h-[780px] border rounded-2xl bg-slate-50 shadow-2xl overflow-hidden ring-1 ring-slate-200">
        <div className="inline-block min-w-full">
          {isEmployeesLoading || isShiftsLoading ? (
            <div className="py-48 text-center"><Loader2 className="h-14 w-14 animate-spin mx-auto text-[#227FD8]" /><p className="mt-4 font-black text-slate-400 uppercase text-base">Inizializzazione Griglia...</p></div>
          ) : (
            <div className="flex flex-col">
              {/* Header Griglia */}
              <div className="flex sticky top-0 z-30 bg-slate-100 border-b shadow-md">
                <div className="w-[110px] p-4 font-black text-[12px] uppercase text-slate-400 sticky left-0 bg-slate-100 border-r z-40 flex items-center justify-center text-center">GIORNO</div>
                {displayEmployees.map(emp => (
                  <div key={emp.id} className="min-w-[260px] p-5 border-r flex items-center gap-4 bg-slate-100/95 backdrop-blur-sm">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-black text-sm">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-base uppercase leading-none">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[11px] font-bold text-[#227FD8] mt-1 uppercase tracking-wider">{emp.jobTitle}</span>
                    </div>
                  </div>
                ))}
                {/* Header Specchietto Copertura */}
                <div className="min-w-[240px] p-4 bg-slate-200/60 flex items-center justify-center gap-3 border-l-2 border-l-slate-300">
                  <Building2 className="h-6 w-6 text-slate-500" />
                  <span className="font-black text-sm uppercase text-slate-600 tracking-tighter">COPERTURA SEDI</span>
                </div>
              </div>

              {/* Corpo Griglia */}
              <div className="divide-y divide-slate-200">
                {daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  if (day.getDay() === 0) return null;

                  const dayShifts = Object.values(indexedEvents[dayStr] || {}).flat();

                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-100/30 transition-colors">
                      {/* Colonna Data */}
                      <div className="w-[110px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center shadow-[3px_0_12px_rgba(0,0,0,0.04)]">
                        <div className="text-[12px] font-black uppercase text-slate-400 mb-1">{format(day, 'EEEE', { locale: it })}</div>
                        <div className="text-[42px] font-black text-slate-800 tracking-tighter leading-none">{format(day, 'dd')}</div>
                      </div>
                      
                      {/* Celle Dipendenti con Doppio Slot */}
                      {displayEmployees.map(emp => {
                        const dayEvents = (indexedEvents[dayStr] || {})[emp.id] || [];
                        
                        // Smistamento per slot visuale
                        const paleseEvents = dayEvents.filter(ev => {
                          const locName = locations?.find(l => l.id === ev.locationId)?.name || "";
                          return !locName.toLowerCase().includes('bisceglie');
                        });
                        const bisceglieEvents = dayEvents.filter(ev => {
                          const locName = locations?.find(l => l.id === ev.locationId)?.name || "";
                          return locName.toLowerCase().includes('bisceglie');
                        });

                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[260px] border-r bg-white flex flex-col p-3 gap-3">
                            {/* SLOT PALESE (Superiore) */}
                            <div className="flex-1 min-h-[110px] border-2 rounded-2xl border-dashed border-slate-100 p-2 relative group/palese bg-slate-50/40">
                              <div className="absolute top-1.5 right-3 text-[10px] font-black text-slate-300 uppercase pointer-events-none tracking-widest">PALESE</div>
                              <div className="flex flex-col gap-2 relative z-10">
                                {paleseEvents.map(ev => <EventBadge key={ev.id} ev={ev} onEdit={() => handleEdit(ev)} />)}
                                <button onClick={() => handleOpenAdd(emp.id, dayStr, locations?.find(l => l.name.toLowerCase().includes('palese'))?.id)} className="w-full py-3.5 rounded-xl border border-dashed border-slate-200 text-slate-300 opacity-0 group-hover/palese:opacity-100 hover:text-[#227FD8] hover:border-[#227FD8]/30 transition-all flex items-center justify-center bg-white/60"><Plus className="h-6 w-6" /></button>
                              </div>
                            </div>
                            {/* SLOT BISCEGLIE (Inferiore) */}
                            <div className="flex-1 min-h-[110px] border-2 rounded-2xl border-dashed border-slate-100 p-2 relative group/bisceglie bg-slate-50/40">
                              <div className="absolute top-1.5 right-3 text-[10px] font-black text-slate-300 uppercase pointer-events-none tracking-widest">BISCEGLIE</div>
                              <div className="flex flex-col gap-2 relative z-10">
                                {bisceglieEvents.map(ev => <EventBadge key={ev.id} ev={ev} onEdit={() => handleEdit(ev)} />)}
                                <button onClick={() => handleOpenAdd(emp.id, dayStr, locations?.find(l => l.name.toLowerCase().includes('bisceglie'))?.id)} className="w-full py-3.5 rounded-xl border border-dashed border-slate-200 text-slate-300 opacity-0 group-hover/bisceglie:opacity-100 hover:text-[#227FD8] hover:border-[#227FD8]/30 transition-all flex items-center justify-center bg-white/60"><Plus className="h-6 w-6" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* SPECCHIETTO COPERTURA (Colonna Destra Finale) */}
                      <div className="min-w-[240px] bg-slate-100/50 p-4 border-l-2 border-l-slate-300 flex flex-col gap-4">
                        {locations?.map(loc => {
                          const locShifts = dayShifts.filter(s => s.locationId === loc.id && s.type !== 'REST' && s.type !== 'ABSENCE');
                          let am = 0; let pm = 0;
                          locShifts.forEach(s => {
                            const start = s.startTime?.includes('T') ? s.startTime.split('T')[1] : s.startTime;
                            const hour = parseInt(start?.split(':')[0] || "0");
                            if (hour < 14) am++; else pm++;
                          });

                          return (
                            <div key={loc.id} className="bg-white rounded-2xl border p-4 shadow-md">
                              <div className="flex items-center gap-2.5 mb-3.5 border-b pb-2.5">
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <Building2 className="h-4.5 w-4.5 text-slate-500" />
                                </div>
                                <span className="font-black text-[12px] uppercase text-slate-700 truncate">{loc.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className={cn("rounded-xl p-2.5 flex flex-col items-center justify-center border-2 shadow-inner", am > 0 ? "bg-green-50 border-green-100" : "bg-rose-50 border-rose-100")}>
                                  <span className="text-[10px] font-black uppercase text-slate-400 mb-0.5">AM</span>
                                  <span className={cn("text-xl font-black", am > 0 ? "text-green-700" : "text-rose-700")}>{am}</span>
                                </div>
                                <div className={cn("rounded-xl p-2.5 flex flex-col items-center justify-center border-2 shadow-inner", pm > 0 ? "bg-green-50 border-green-100" : "bg-rose-50 border-rose-100")}>
                                  <span className="text-[10px] font-black uppercase text-slate-400 mb-0.5">PM</span>
                                  <span className={cn("text-xl font-black", pm > 0 ? "text-green-700" : "text-rose-700")}>{pm}</span>
                                </div>
                              </div>
                            </div>
                          )
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

      {/* Dialog Gestione Turno */}
      <Dialog open={isShiftOpen || isEditOpen} onOpenChange={(o) => { if(!o) { setIsShiftOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-7 bg-[#227FD8] text-white">
            <DialogTitle className="font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
              <Clock className="h-8 w-8" /> {form.id ? "Modifica Record" : "Nuovo Turno"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-7 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Tipologia</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="h-12 font-bold rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL" className="font-bold">Turno Lavorativo</SelectItem>
                  <SelectItem value="REST" className="font-bold">Riposo Settimanale</SelectItem>
                  <SelectItem value="ABSENCE" className="font-bold">Assenza / Ferie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Etichetta</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="es. Mattina, Pomeriggio..." className="h-12 font-bold rounded-xl border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Dalle Ore</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="h-12 font-bold rounded-xl border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Alle Ore</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="h-12 font-bold rounded-xl border-slate-200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Sede Operativa</Label>
              <Select value={form.locationId} onValueChange={v => setForm({...form, locationId: v})}>
                <SelectTrigger className="h-12 font-bold rounded-xl border-slate-200"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-7 bg-slate-50 border-t flex items-center justify-between gap-5">
            {form.id && (
              <Button variant="ghost" onClick={() => { deleteDocumentNonBlocking(doc(db, "employees", form.employeeId, "shifts", form.id)); setIsEditOpen(false); }} className="text-rose-600 font-black uppercase text-xs h-12 px-6 hover:bg-rose-50">
                <Trash2 className="h-4 w-4 mr-2" /> ELIMINA
              </Button>
            )}
            <Button onClick={handleSave} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black flex-1 h-12 uppercase tracking-widest shadow-xl rounded-2xl">
              SALVA DATI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventBadge({ ev, onEdit }: { ev: any, onEdit: () => void }) {
  const start = ev.startTime ? format(parseISO(ev.startTime), 'HH:mm') : "00:00";
  const end = ev.endTime ? format(parseISO(ev.endTime), 'HH:mm') : "00:00";
  const isMorning = parseInt(start.split(':')[0]) < 14;

  let colorClass = "border-l-amber-500 bg-amber-50 text-amber-900";
  let icon = <Sun className="h-4.5 w-4.5 text-amber-500" />;

  if (ev.type === 'REST') {
    colorClass = "border-l-slate-400 bg-slate-100 text-slate-600";
    icon = <Coffee className="h-4.5 w-4.5 text-slate-400" />;
  } else if (ev.type === 'ABSENCE') {
    colorClass = "border-l-rose-600 bg-rose-50 text-rose-900";
    icon = <Umbrella className="h-4.5 w-4.5 text-rose-600" />;
  } else if (!isMorning) {
    colorClass = "border-l-indigo-600 bg-indigo-50 text-indigo-900";
    icon = <Moon className="h-4.5 w-4.5 text-indigo-600" />;
  }

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className={cn(
        "group relative p-4 rounded-2xl border-l-[6px] shadow-sm cursor-pointer hover:shadow-lg transition-all w-full border border-slate-100/50",
        colorClass
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
            {ev.type === 'REST' ? 'RIPOSO' : ev.type === 'ABSENCE' ? 'ASSENZA' : 'LAVORO'}
          </span>
          {icon}
        </div>
        <div className="text-[13px] font-black tracking-tighter leading-none">{start} - {end}</div>
        <div className="text-[11px] font-bold uppercase truncate opacity-80">{ev.title || 'Turno'}</div>
      </div>
    </div>
  )
}
