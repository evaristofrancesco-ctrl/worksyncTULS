
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
  Coffee,
  MoreVertical
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // States per i Dialogs
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<any>(null)

  const [form, setForm] = useState({
    id: "",
    employeeId: "",
    locationId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "09:00",
    endTime: "13:00",
    title: "Turno Lavoro",
    type: "MANUAL" // MANUAL (Lavoro), REST (Riposo), ABSENCE (Assenza)
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
    return query(collectionGroup(db, "shifts"), limit(1500));
  }, [db])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  // Ordine fisso richiesto: Vittorio, Isa, Rosa, Savino
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

  const handleOpenAdd = (employeeId: string, date: string) => {
    setForm({
      id: "",
      employeeId,
      locationId: employees?.find(e => e.id === employeeId)?.locationId || "",
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

  const handleDelete = (event: any) => {
    deleteDocumentNonBlocking(doc(db, "employees", event.employeeId, "shifts", event.id));
    toast({ title: "Eliminato" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pianificazione Libera</h1>
          <p className="text-sm text-slate-500 font-medium italic">Gestione manuale dei badge: clicca sul "+" per aggiungere, sull'evento per modificare.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-lg font-black uppercase tracking-tight min-w-[180px] text-center">
            {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-5 w-5" /></Button>
        </div>
      </div>

      <ScrollArea className="w-full h-[700px] border rounded-2xl bg-white shadow-xl">
        <div className="inline-block min-w-full">
          {isEmployeesLoading || isShiftsLoading ? (
            <div className="py-32 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
          ) : (
            <div className="flex flex-col">
              {/* HEADER DIPENDENTI */}
              <div className="flex sticky top-0 z-30 bg-slate-50 border-b">
                <div className="w-[100px] p-4 font-black text-[10px] uppercase text-slate-400 sticky left-0 bg-slate-50 border-r z-40 flex items-center">DATA</div>
                {displayEmployees.map(emp => (
                  <div key={emp.id} className="min-w-[250px] p-4 border-r flex items-center gap-3 bg-slate-50/90 backdrop-blur-sm">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={emp.photoUrl} />
                      <AvatarFallback className="font-black text-xs bg-slate-200">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-lg leading-none">{emp.firstName} {emp.lastName}</span>
                      <span className="text-[9px] font-black uppercase text-[#227FD8] tracking-widest mt-1">{emp.locationName || "Sede N.D."}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* GRIGLIA GIORNI */}
              <div className="divide-y divide-slate-100">
                {daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  if (day.getDay() === 0) return null; // Salta Domenica

                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-50/20 transition-colors">
                      <div className="w-[100px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{format(day, 'EEE', { locale: it })}</div>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter">{format(day, 'dd')}</div>
                      </div>
                      
                      {displayEmployees.map(emp => {
                        const dayEvents = (indexedEvents[dayStr] || {})[emp.id] || [];
                        
                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[250px] border-r p-2 bg-white relative group/cell">
                            <div className="flex flex-col gap-2">
                              {dayEvents.map(ev => (
                                <EventBadge key={ev.id} ev={ev} onEdit={() => handleEdit(ev)} onDelete={() => handleDelete(ev)} />
                              ))}
                              
                              {/* Pulsante aggiunta veloce */}
                              <button 
                                onClick={() => handleOpenAdd(emp.id, dayStr)}
                                className="w-full py-2 rounded-lg border-2 border-dashed border-slate-100 text-slate-300 opacity-0 group-hover/cell:opacity-100 hover:border-blue-200 hover:text-blue-400 transition-all flex items-center justify-center"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
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

      {/* DIALOG GESTIONE EVENTO */}
      <Dialog open={isShiftOpen || isEditOpen} onOpenChange={(o) => { if(!o) { setIsShiftOpen(false); setIsEditOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase">{form.id ? "Modifica" : "Nuovo"} Badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Tipo di Badge</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Turno Lavoro (Colorato)</SelectItem>
                  <SelectItem value="REST">Riposo Settimanale (Grigio)</SelectItem>
                  <SelectItem value="ABSENCE">Assenza/Ferie (Rosso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Etichetta Badge</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="es. Mattina, Riposo, Ferie..." className="h-11 font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Inizio</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="h-11" />
              </div>
              <div className="space-y-1">
                <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Fine</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="h-11" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Sede (opzionale)</Label>
              <Select value={form.locationId} onValueChange={v => setForm({...form, locationId: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Sede..." /></SelectTrigger>
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

function EventBadge({ ev, onEdit, onDelete }: { ev: any, onEdit: () => void, onDelete: () => void }) {
  const start = format(parseISO(ev.startTime), 'HH:mm');
  const end = format(parseISO(ev.endTime), 'HH:mm');
  const isMorning = parseISO(ev.startTime).getHours() < 14;

  let colorClass = "border-l-[#227FD8] bg-blue-50/30 text-blue-900";
  let icon = <Sun className="h-3.5 w-3.5 text-blue-500" />;

  if (ev.type === 'REST') {
    colorClass = "border-l-slate-400 bg-slate-100 text-slate-600";
    icon = <Coffee className="h-3.5 w-3.5 text-slate-400" />;
  } else if (ev.type === 'ABSENCE') {
    colorClass = "border-l-rose-600 bg-rose-50 text-rose-900";
    icon = <Umbrella className="h-3.5 w-3.5 text-rose-600" />;
  } else if (!isMorning) {
    colorClass = "border-l-indigo-600 bg-indigo-50/30 text-indigo-900";
    icon = <Moon className="h-3.5 w-3.5 text-indigo-600" />;
  } else {
    colorClass = "border-l-amber-500 bg-amber-50/30 text-amber-900";
    icon = <Sun className="h-3.5 w-3.5 text-amber-500" />;
  }

  return (
    <div 
      onClick={onEdit}
      className={cn(
        "group relative p-3 rounded-xl border-l-[6px] shadow-sm cursor-pointer hover:shadow-md transition-all w-full",
        colorClass
      )}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
            {ev.type === 'REST' ? 'RIPOSO' : ev.type === 'ABSENCE' ? 'ASSENZA' : 'LAVORO'}
          </span>
          {icon}
        </div>
        <div className="text-sm font-black tracking-tight">{start} - {end}</div>
        <div className="text-[11px] font-bold uppercase truncate">{ev.title || 'Turno'}</div>
      </div>
    </div>
  )
}
