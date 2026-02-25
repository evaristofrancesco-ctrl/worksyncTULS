
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
import { collection, doc, collectionGroup, query, limit } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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

  const displayEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
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
    // Rimosso ordinamento server-side per evitare errore di indice mancante
    return query(collectionGroup(db, "requests"), limit(500));
  }, [db])
  const { data: allRequests } = useCollection(requestsQuery)

  const weekShifts = useMemo(() => {
    if (!shifts) return [];
    const weekEnd = addDays(weekStart, 7);
    return shifts.filter(s => {
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
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato." });
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
        const isSavino = emp.firstName?.toLowerCase().includes('savino') || emp.lastName?.toLowerCase().includes('savino');

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

          if (isSavino) {
            let amEndHour = 10;
            if (i === 3) amEndHour = 13;
            else if (i === 5) amEndHour = 11;

            const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
            const hasAM = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() < 14);
            if (!hasAM) {
              const startAM = new Date(targetDay); startAM.setHours(9, 0, 0);
              const endAM = new Date(targetDay); endAM.setHours(amEndHour, 0, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
                id: idAM, employeeId: emp.id, title: "Turno Mattina", date: dateStr, startTime: startAM.toISOString(), endTime: endAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING", type: "AUTO"
              }, { merge: true });
            }

            const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
            const hasPM = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() >= 14);
            if (!hasPM) {
              const startPM = new Date(targetDay); startPM.setHours(17, 0, 0);
              const endPM = new Date(targetDay); endPM.setHours(20, 20, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
                id: idPM, employeeId: emp.id, title: "Turno Pomeriggio", date: dateStr, startTime: startPM.toISOString(), endTime: endPM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO"
              }, { merge: true });
            }
            continue;
          }

          if (emp.contractType === "full-time") {
            const mOver = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
            if (!mOver) {
              const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
              const hasM = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() < 14);
              if (!hasM) {
                const sAM = new Date(targetDay); sAM.setHours(9, 0, 0);
                const eAM = new Date(targetDay); eAM.setHours(13, 0, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), { id: idAM, employeeId: emp.id, title: "Turno Mattina", date: dateStr, startTime: sAM.toISOString(), endTime: eAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING", type: "AUTO" }, { merge: true });
              }
            }
            const pOver = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!pOver) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const hasP = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() >= 14);
              if (!hasP) {
                const sPM = new Date(targetDay); sPM.setHours(17, 0, 0);
                const ePM = new Date(targetDay); ePM.setHours(20, 20, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), { id: idPM, employeeId: emp.id, title: "Turno Pomeriggio", date: dateStr, startTime: sPM.toISOString(), endTime: ePM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO" }, { merge: true });
              }
            }
          } else {
            const pOver = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
            if (!pOver) {
              const idPM = `shift-${emp.id}-${dateStr}-AFTERNOON`;
              const hasP = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() >= 14);
              if (!hasP) {
                const sPT = new Date(targetDay); sPT.setHours(17, 0, 0);
                const ePT = new Date(targetDay); ePT.setHours(20, 20, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), { id: idPM, employeeId: emp.id, title: "Turno Pomeriggio (PT)", date: dateStr, startTime: sPT.toISOString(), endTime: ePT.toISOString(), status: "SCHEDULED", companyId: "default", slot: "AFTERNOON", type: "AUTO" }, { merge: true });
              }
            }
          }
        }
      }
      toast({ title: "Settimana Rigenerata" });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleSaveAbsence = () => {
    if (!newAbsence.employeeId || !newAbsence.startDate) return;
    const id = `abs-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "employees", newAbsence.employeeId, "requests", id), { ...newAbsence, id, status: "Approvato", submittedAt: new Date().toISOString() }, { merge: true });
    setIsAbsenceOpen(false);
    toast({ title: "Assenza Registrata" });
  }

  const handleSaveManualShift = () => {
    if (!newManualShift.employeeId || !newManualShift.date) return;
    const id = `shift-man-${Date.now()}`;
    const sObj = new Date(`${newManualShift.date}T${newManualShift.startTime}`);
    const eObj = new Date(`${newManualShift.date}T${newManualShift.endTime}`);
    setDocumentNonBlocking(doc(db, "employees", newManualShift.employeeId, "shifts", id), { id, employeeId: newManualShift.employeeId, title: newManualShift.title, date: newManualShift.date, startTime: sObj.toISOString(), endTime: eObj.toISOString(), status: "SCHEDULED", companyId: "default", slot: sObj.getHours() < 14 ? "MORNING" : "AFTERNOON", type: "MANUAL" }, { merge: true });
    setIsShiftOpen(false);
    toast({ title: "Turno Inserito" });
  }

  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setNewManualShift({
      employeeId: shift.employeeId,
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
      type: "MANUAL" // Diventa manuale se modificato
    });
    setIsEditOpen(false);
    toast({ title: "Turno Aggiornato" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pianificazione Turni</h1>
          <p className="text-slate-500 font-medium">Agenda settimanale del team.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAbsenceOpen(true)} className="font-bold border-amber-200 text-amber-700 bg-amber-50 h-11 px-6"><UserMinus className="h-4 w-4 mr-2" /> Assenza</Button>
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="font-bold border-blue-200 text-[#227FD8] h-11">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Genera</Button>
          <Button onClick={() => setIsShiftOpen(true)} className="bg-[#227FD8] font-black h-11 px-6 shadow-lg"><Plus className="h-4 w-4 mr-2" /> Nuovo Turno</Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft className="h-5 w-5" /></Button>
              <div className="text-center min-w-[200px]">
                <span className="text-xl font-black text-slate-900 uppercase">
                  {format(weekStart, 'dd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: it })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} className="font-bold uppercase">Oggi</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full h-[700px]">
            <div className="inline-block min-w-full">
              <div className="flex sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="w-[180px] p-4 font-black text-xs uppercase text-slate-400 sticky left-0 bg-white border-r z-40">DATA</div>
                {displayEmployees.map((emp) => (
                  <div key={emp.id} className="min-w-[220px] p-4 border-r flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={emp.photoUrl} /><AvatarFallback>{emp.firstName.charAt(0)}</AvatarFallback></Avatar>
                    <span className="font-bold text-slate-900 text-sm">{emp.firstName}</span>
                  </div>
                ))}
              </div>

              <div className="divide-y">
                {isEmployeesLoading || isShiftsLoading ? (
                  <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
                ) : daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  return (
                    <div key={dayStr} className="flex group hover:bg-slate-50/30">
                      <div className="w-[180px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center">
                        <div className="text-xs font-black uppercase text-slate-400">{format(day, 'EEEE', { locale: it })}</div>
                        <div className="text-2xl font-black">{format(day, 'dd')}</div>
                      </div>
                      {displayEmployees.map((emp) => {
                        const dayShifts = weekShifts.filter(s => s.employeeId === emp.id && s.date === dayStr);
                        const dayAbsences = weekAbsences.filter(abs => abs.employeeId === emp.id && dayStr >= abs.startDate && dayStr <= (abs.endDate || abs.startDate));
                        return (
                          <div key={`${dayStr}-${emp.id}`} className="min-w-[220px] p-3 border-r min-h-[120px] flex flex-col gap-2">
                            {dayAbsences.map(a => <Badge key={a.id} className="bg-rose-50 text-rose-700 border-rose-200">{a.type}</Badge>)}
                            {dayShifts.map(s => (
                              <div key={s.id} className="group/item relative p-2 rounded-lg bg-blue-50 border-l-4 border-blue-400 text-blue-900 text-xs shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold uppercase opacity-60 text-[9px]">{s.title || "Turno"}</span>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditShift(s)} className="text-blue-400 hover:text-blue-700"><Edit className="h-3 w-3" /></button>
                                    <button onClick={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} className="text-rose-400 hover:text-rose-700"><Trash2 className="h-3 w-3" /></button>
                                  </div>
                                </div>
                                <div className="font-black">{format(parseISO(s.startTime), 'HH:mm')} - {format(parseISO(s.endTime), 'HH:mm')}</div>
                              </div>
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
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs per Nuovo Turno e Modifica Turno */}
      <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Nuovo Turno Manuale</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Collaboratore</Label>
              <Select value={newManualShift.employeeId} onValueChange={v => setNewManualShift({...newManualShift, employeeId: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Data</Label>
              <Input type="date" value={newManualShift.date} onChange={e => setNewManualShift({...newManualShift, date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
              <Input type="time" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveManualShift} className="bg-[#227FD8] font-black w-full h-11">SALVA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditShiftOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Modifica Turno</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="font-bold">Orari</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input type="time" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
                <Input type="time" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2"><Label className="font-bold">Titolo</Label>
              <Input value={newManualShift.title} onChange={e => setNewManualShift({...newManualShift, title: e.target.value})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateShift} className="bg-[#227FD8] font-black w-full h-11">AGGIORNA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-rose-600">Registra Assenza</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Dipendente</Label>
              <Select value={newAbsence.employeeId} onValueChange={v => setNewAbsence({...newAbsence, employeeId: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold">Giorno</Label><Input type="date" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-bold">Tipo</Label>
                <Select value={newAbsence.type} onValueChange={v => setNewAbsence({...newAbsence, type: v})}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="VACATION">Ferie</SelectItem><SelectItem value="SICK">Malattia</SelectItem><SelectItem value="PERSONAL">Permesso</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveAbsence} className="bg-rose-600 font-black w-full h-11">CONFERMA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
