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
  Lock,
  AlertCircle,
  BarChart3,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup, query } from "firebase/firestore"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

  // Ordinamento dipendenti per Sede per permettere la distinzione visiva
  const displayEmployees = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter(emp => {
        const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
        return !isFrancesco;
      })
      .sort((a, b) => (a.locationName || "").localeCompare(b.locationName || ""));
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

  const coverageAnalysis = useMemo(() => {
    if (!locations || !weekShifts || !displayEmployees || !daysOfVisualizedWeek || !weekAbsences) return [];
    
    const gaps: any[] = [];
    
    daysOfVisualizedWeek.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0) return;

      locations.forEach(loc => {
        const locEmployees = displayEmployees.filter(e => e.locationId === loc.id);

        const actuallyPresentMorning = locEmployees.filter(emp => {
          const hasShift = weekShifts.some(s => s.employeeId === emp.id && s.date === dayStr && parseISO(s.startTime).getHours() < 14);
          const hasAbsence = weekAbsences.some(abs => 
            abs.employeeId === emp.id && 
            dayStr >= abs.startDate && 
            dayStr <= (abs.endDate || abs.startDate) &&
            abs.type !== 'HOURLY_PERMIT'
          );
          return hasShift && !hasAbsence;
        });

        const actuallyPresentAfternoon = locEmployees.filter(emp => {
          const hasShift = weekShifts.some(s => s.employeeId === emp.id && s.date === dayStr && parseISO(s.startTime).getHours() >= 14);
          const hasAbsence = weekAbsences.some(abs => 
            abs.employeeId === emp.id && 
            dayStr >= abs.startDate && 
            dayStr <= (abs.endDate || abs.startDate) &&
            abs.type !== 'HOURLY_PERMIT'
          );
          return hasShift && !hasAbsence;
        });

        if (actuallyPresentMorning.length === 0) {
          gaps.push({ day: dayStr, dayName: format(day, 'EEEE d MMMM', { locale: it }), location: loc.name, slot: "Mattina", id: `gap-${dayStr}-${loc.id}-AM` });
        }
        if (actuallyPresentAfternoon.length === 0) {
          gaps.push({ day: dayStr, dayName: format(day, 'EEEE d MMMM', { locale: it }), location: loc.name, slot: "Pomeriggio", id: `gap-${dayStr}-${loc.id}-PM` });
        }
      });
    });
    
    return gaps;
  }, [locations, weekShifts, displayEmployees, daysOfVisualizedWeek, weekAbsences]);

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
            const mOver = targetDay.getDay().toString() === emp.restDay && (("09:00" < (emp.restEndTime || "00:00") && "13:00" > (emp.restStartTime || "00:00")));
            if (!mOver) {
              const idAM = `shift-${emp.id}-${dateStr}-MORNING`;
              const hasM = weekShifts.some(s => s.employeeId === emp.id && s.date === dateStr && s.type === 'MANUAL' && parseISO(s.startTime).getHours() < 14);
              if (!hasM) {
                const sAM = new Date(targetDay); sAM.setHours(9, 0, 0);
                const eAM = new Date(targetDay); eAM.setHours(13, 0, 0);
                setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), { id: idAM, employeeId: emp.id, title: "Turno Mattina", date: dateStr, startTime: sAM.toISOString(), endTime: eAM.toISOString(), status: "SCHEDULED", companyId: "default", slot: "MORNING", type: "AUTO" }, { merge: true });
              }
            }
            const pOver = targetDay.getDay().toString() === emp.restDay && (("17:00" < (emp.restEndTime || "00:00") && "20:20" > (emp.restStartTime || "00:00")));
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
            const pOver = targetDay.getDay().toString() === emp.restDay && (("17:00" < (emp.restEndTime || "00:00") && "20:20" > (emp.restStartTime || "00:00")));
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
      type: "MANUAL"
    });
    setIsEditOpen(false);
    toast({ title: "Turno Aggiornato" });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pianificazione Turni</h1>
          <p className="text-slate-500 font-medium">Agenda settimanale del team con distinzione per sede e fasce orarie.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAbsenceOpen(true)} className="font-bold border-amber-200 text-amber-700 bg-amber-50 h-11 px-6"><UserMinus className="h-4 w-4 mr-2" /> Assenza</Button>
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="font-bold border-blue-200 text-[#227FD8] h-11">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Genera</Button>
          <Button onClick={() => setIsShiftOpen(true)} className="bg-[#227FD8] font-black h-11 px-6 shadow-lg"><Plus className="h-4 w-4 mr-2" /> Nuovo Turno</Button>
        </div>
      </div>

      {coverageAnalysis.length > 0 && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 shadow-sm animate-in slide-in-from-top-4">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <AlertTitle className="font-black uppercase tracking-tight text-rose-800">Attenzione: Sedi Scoperte</AlertTitle>
          <AlertDescription className="text-rose-700 font-medium grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 mt-2">
            {coverageAnalysis.map(gap => (
              <div key={gap.id} className="flex items-center gap-2 text-xs">
                <span className="font-black text-rose-900 min-w-[100px]">{gap.dayName}:</span>
                <span className="bg-rose-200/50 px-1.5 py-0.5 rounded font-bold">{gap.location}</span>
                <span className="italic">({gap.slot})</span>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

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
          <ScrollArea className="w-full h-[750px]">
            <div className="inline-block min-w-full">
              {/* Header Colonne Dipendenti */}
              <div className="flex sticky top-0 z-30 bg-white border-b shadow-sm">
                <div className="w-[180px] p-4 font-black text-xs uppercase text-slate-400 sticky left-0 bg-white border-r z-40">DATA</div>
                {displayEmployees.map((emp, idx) => {
                  const prevEmp = displayEmployees[idx - 1];
                  const isNewLocation = !prevEmp || prevEmp.locationId !== emp.locationId;
                  
                  return (
                    <div 
                      key={emp.id} 
                      className={cn(
                        "min-w-[220px] p-4 border-r flex items-center gap-3",
                        isNewLocation && idx > 0 && "border-l-4 border-l-slate-300"
                      )}
                    >
                      <Avatar className="h-8 w-8 shadow-sm ring-1 ring-slate-100"><AvatarImage src={emp.photoUrl} /><AvatarFallback className="font-bold">{(emp.firstName || "U").charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm leading-tight">{emp.firstName}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{emp.locationName || "Sede N.D."}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="min-w-[250px] p-4 bg-slate-100/50 flex items-center gap-2 border-l-4 border-slate-300">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <span className="font-black text-xs uppercase text-slate-600">Riepilogo Sedi</span>
                </div>
              </div>

              {/* Righe Giornaliere */}
              <div className="divide-y">
                {isEmployeesLoading || isShiftsLoading ? (
                  <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
                ) : daysOfVisualizedWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const hasGaps = coverageAnalysis.some(g => g.day === dayStr);
                  
                  return (
                    <div key={dayStr} className={cn("flex group hover:bg-slate-50/30", hasGaps && "bg-rose-50/10")}>
                      {/* Cella Data (Sticky a sinistra) */}
                      <div className="w-[180px] p-4 sticky left-0 bg-white border-r z-20 flex flex-col justify-center text-center relative">
                        {hasGaps && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Sedi scoperte in questo giorno" />}
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{format(day, 'EEEE', { locale: it })}</div>
                        <div className="text-3xl font-black text-slate-800">{format(day, 'dd')}</div>
                      </div>
                      
                      {/* Celle Dipendenti */}
                      {displayEmployees.map((emp, idx) => {
                        const prevEmp = displayEmployees[idx - 1];
                        const isNewLocation = !prevEmp || prevEmp.locationId !== emp.locationId;

                        const dayShifts = weekShifts.filter(s => s.employeeId === emp.id && s.date === dayStr);
                        const morningShifts = dayShifts.filter(s => parseISO(s.startTime).getHours() < 14).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                        const afternoonShifts = dayShifts.filter(s => parseISO(s.startTime).getHours() >= 14).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                        
                        const dayAbsences = weekAbsences.filter(abs => abs.employeeId === emp.id && dayStr >= abs.startDate && dayStr <= (abs.endDate || abs.startDate));
                        
                        const morningAbsences = dayAbsences.filter(abs => {
                          if (abs.type === 'HOURLY_PERMIT') {
                            const startH = parseInt(abs.startTime?.split(':')[0] || "0");
                            return startH < 14;
                          }
                          return true;
                        });

                        const afternoonAbsences = dayAbsences.filter(abs => {
                          if (abs.type === 'HOURLY_PERMIT') {
                            const endH = parseInt(abs.endTime?.split(':')[0] || "0");
                            const startH = parseInt(abs.startTime?.split(':')[0] || "0");
                            return endH >= 14 || startH >= 14;
                          }
                          return true;
                        });
                        
                        return (
                          <div 
                            key={`${dayStr}-${emp.id}`} 
                            className={cn(
                              "min-w-[220px] p-0 border-r min-h-[180px] flex flex-col",
                              isNewLocation && idx > 0 && "border-l-4 border-l-slate-300"
                            )}
                          >
                            {/* Sezione Mattina */}
                            <div className="flex-1 p-2 flex flex-col gap-2 min-h-[90px]">
                              <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1 mb-1">
                                <Sun className="h-2 w-2" /> MATTINA
                              </div>
                              {morningAbsences.map(a => (
                                <AbsenceItem key={a.id} a={a} isMorning={true} />
                              ))}
                              {morningShifts.map(s => (
                                <ShiftItem key={s.id} s={s} isMorning={true} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />
                              ))}
                            </div>

                            {/* Spazio Vuoto (senza linea orizzontale come richiesto) */}
                            <div className="h-2" />

                            {/* Sezione Pomeriggio */}
                            <div className="flex-1 p-2 flex flex-col gap-2 min-h-[90px] bg-slate-50/20">
                              <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1 mb-1">
                                <Moon className="h-2 w-2" /> POMERIGGIO
                              </div>
                              {afternoonAbsences.map(a => (
                                <AbsenceItem key={a.id} a={a} isMorning={false} />
                              ))}
                              {afternoonShifts.map(s => (
                                <ShiftItem key={s.id} s={s} isMorning={false} onEdit={() => handleEditShift(s)} onDelete={() => deleteDocumentNonBlocking(doc(db, "employees", s.employeeId, "shifts", s.id))} />
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Riepilogo Sedi (Specchietto a destra) */}
                      <div className="min-w-[250px] p-0 border-l-4 border-slate-300 bg-slate-50/40 flex flex-col">
                        <div className="flex-1 p-3 flex flex-col gap-1.5 min-h-[90px]">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Users className="h-2 w-2" /> Conta Mattina
                          </div>
                          {locations?.map(loc => {
                            const count = displayEmployees.filter(e => e.locationId === loc.id).reduce((acc, emp) => {
                              const hasShift = weekShifts.some(s => s.employeeId === emp.id && s.date === dayStr && parseISO(s.startTime).getHours() < 14);
                              const isAbsent = weekAbsences.some(abs => 
                                abs.employeeId === emp.id && 
                                dayStr >= abs.startDate && 
                                dayStr <= (abs.endDate || abs.startDate) &&
                                abs.type !== 'HOURLY_PERMIT'
                              );
                              return acc + (hasShift && !isAbsent ? 1 : 0);
                            }, 0);
                            return (
                              <div key={`sum-am-${loc.id}`} className={cn("flex justify-between items-center px-2 py-1 rounded border", count > 0 ? "bg-white border-slate-200" : "bg-rose-50 border-rose-200 animate-pulse")}>
                                <span className={cn("text-[10px] font-bold truncate max-w-[150px]", count > 0 ? "text-slate-600" : "text-rose-700")}>{loc.name}</span>
                                <Badge variant={count > 0 ? "default" : "destructive"} className={cn("h-5 px-1.5 text-[10px] font-black", count > 0 ? "bg-[#227FD8]" : "")}>{count}</Badge>
                              </div>
                            )
                          })}
                        </div>

                        <div className="h-2" />

                        <div className="flex-1 p-3 flex flex-col gap-1.5 min-h-[90px]">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Users className="h-2 w-2" /> Conta Pomeriggio
                          </div>
                          {locations?.map(loc => {
                            const count = displayEmployees.filter(e => e.locationId === loc.id).reduce((acc, emp) => {
                              const hasShift = weekShifts.some(s => s.employeeId === emp.id && s.date === dayStr && parseISO(s.startTime).getHours() >= 14);
                              const isAbsent = weekAbsences.some(abs => 
                                abs.employeeId === emp.id && 
                                dayStr >= abs.startDate && 
                                dayStr <= (abs.endDate || abs.startDate) &&
                                abs.type !== 'HOURLY_PERMIT'
                              );
                              return acc + (hasShift && !isAbsent ? 1 : 0);
                            }, 0);
                            return (
                              <div key={`sum-pm-${loc.id}`} className={cn("flex justify-between items-center px-2 py-1 rounded border", count > 0 ? "bg-white border-slate-200" : "bg-rose-50 border-rose-200 animate-pulse")}>
                                <span className={cn("text-[10px] font-bold truncate max-w-[150px]", count > 0 ? "text-slate-600" : "text-rose-700")}>{loc.name}</span>
                                <Badge variant={count > 0 ? "secondary" : "destructive"} className={cn("h-5 px-1.5 text-[10px] font-black", count > 0 ? "bg-slate-700 text-white" : "")}>{count}</Badge>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog Nuovo Turno */}
      <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase tracking-tight">Nuovo Turno Manuale</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Collaboratore</Label>
              <Select value={newManualShift.employeeId} onValueChange={v => setNewManualShift({...newManualShift, employeeId: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Data</Label>
              <Input type="date" className="h-11" value={newManualShift.date} onChange={e => setNewManualShift({...newManualShift, date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-500">Inizio</Label>
                <Input type="time" className="h-11" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-500">Fine</Label>
                <Input type="time" className="h-11" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Titolo (opzionale)</Label>
              <Input className="h-11" placeholder="es. Turno Extra" value={newManualShift.title} onChange={e => setNewManualShift({...newManualShift, title: e.target.value})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveManualShift} className="bg-[#227FD8] font-black w-full h-12 uppercase tracking-widest shadow-lg">SALVA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica Turno */}
      <Dialog open={isEditShiftOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase tracking-tight">Modifica Turno</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Orari</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input type="time" className="h-11" value={newManualShift.startTime} onChange={e => setNewManualShift({...newManualShift, startTime: e.target.value})} />
                <Input type="time" className="h-11" value={newManualShift.endTime} onChange={e => setNewManualShift({...newManualShift, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Titolo</Label>
              <Input className="h-11" value={newManualShift.title} onChange={e => setNewManualShift({...newManualShift, title: e.target.value})} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpdateShift} className="bg-[#227FD8] font-black w-full h-12 uppercase tracking-widest shadow-lg">AGGIORNA TURNO</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assenza */}
      <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase tracking-tight text-rose-600">Registra Assenza</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-slate-500">Dipendente</Label>
              <Select value={newAbsence.employeeId} onValueChange={v => setNewAbsence({...newAbsence, employeeId: v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                <SelectContent>{displayEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Giorno</Label><Input type="date" className="h-11" value={newAbsence.startDate} onChange={e => setNewAbsence({...newAbsence, startDate: e.target.value})} /></div>
              <div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Tipo</Label>
                <Select value={newAbsence.type} onValueChange={v => setNewAbsence({...newAbsence, type: v})}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="VACATION">Ferie</SelectItem><SelectItem value="SICK">Malattia</SelectItem><SelectItem value="PERSONAL">Permesso</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveAbsence} className="bg-rose-600 font-black w-full h-12 uppercase tracking-widest shadow-lg">CONFERMA ASSENZA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShiftItem({ s, isMorning, onEdit, onDelete }: { s: any, isMorning: boolean, onEdit: () => void, onDelete: () => void }) {
  return (
    <div 
      className={cn(
        "group/item relative p-2 rounded-lg border-l-4 shadow-sm transition-all hover:scale-[1.02]",
        isMorning 
          ? "bg-amber-50/80 border-amber-400 text-amber-900" 
          : "bg-indigo-50/80 border-indigo-400 text-indigo-900"
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {isMorning ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-indigo-500" />}
            <span className="font-black uppercase tracking-tighter text-[8px] opacity-70 truncate max-w-[100px]">{s.title || (isMorning ? "Mattina" : "Pomeriggio")}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-black/5 rounded-md"><Edit className="h-3 w-3" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-rose-500/10 rounded-md text-rose-600"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="font-black text-[11px] flex items-center gap-1">
        <Clock className="h-3 w-3 opacity-40" />
        {format(parseISO(s.startTime), 'HH:mm')} - {format(parseISO(s.endTime), 'HH:mm')}
      </div>
    </div>
  )
}

function AbsenceItem({ a, isMorning }: { a: any, isMorning: boolean }) {
  const getIcon = () => {
    switch(a.type) {
      case 'VACATION': return <Umbrella className="h-3 w-3" />;
      case 'SICK': return <Activity className="h-3 w-3" />;
      case 'HOURLY_PERMIT': return <Timer className="h-3 w-3" />;
      default: return <UserMinus className="h-3 w-3" />;
    }
  }

  const getLabel = () => {
    switch(a.type) {
      case 'VACATION': return 'Ferie';
      case 'SICK': return 'Malattia';
      case 'HOURLY_PERMIT': return 'Permesso';
      default: return a.type;
    }
  }

  return (
    <div className="bg-rose-50 border-l-4 border-rose-400 p-2 rounded-lg shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {getIcon()}
        <span className="font-black uppercase tracking-tighter text-[8px] text-rose-700">{getLabel()}</span>
      </div>
      <div className="font-black text-[10px] text-rose-900">
        {a.type === 'HOURLY_PERMIT' ? `${a.startTime} - ${a.endTime}` : 'Tutto il giorno'}
      </div>
    </div>
  )
}
