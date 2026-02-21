
"use client"

import { Clock, Search, Loader2, Zap, UserCheck, Plus, Edit, Trash2, Save, AlertTriangle, ShieldCheck, Fingerprint, Info, Check, X, Umbrella, Activity, Timer, CalendarDays, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { useState, useMemo, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { format, addDays, parseISO, isSunday, subDays, startOfDay } from "date-fns"
import { it } from "date-fns/locale"

export default function AttendancePage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  // Stati per i Filtri
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterType, setFilterType] = useState("all")
  
  // Per default mostriamo solo l'ultima settimana per pulizia visiva
  const [showAllHistory, setShowAllHistory] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isForceOpen, setIsForceOpen] = useState(false)
  const [isAutoOpen, setIsAutoOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)

  // Form per inserimento forzato
  const [newEntry, setNewEntry] = useState({
    employeeId: "",
    date: new Date().toISOString().split('T')[0],
    checkIn: "09:00",
    checkOut: "13:00"
  })

  // Parametri Generazione Automatica
  const [autoParams, setAutoParams] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedEmployees: [] as string[],
    selectAll: true
  })

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const activeEmployees = useMemo(() => employees?.filter(e => e.isActive) || [], [employees]);

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "timeentries");
  }, [db])
  const { data: entries, isLoading: isLoadingEntries } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "requests");
  }, [db])
  const { data: allRequests, isLoading: isLoadingRequests } = useCollection(requestsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as Record<string, any>);
  }, [employees]);

  const unifiedEntries = useMemo(() => {
    const realEntries = entries || [];
    
    const mappedRequests = (allRequests || [])
      .filter(req => {
        const status = (req.status || "").toUpperCase();
        return status === "APPROVATO" || status === "APPROVED" || status === "Approvato";
      })
      .map(req => {
        const start = req.startDate + (req.startTime ? `T${req.startTime}` : "T09:00");
        const end = (req.endDate || req.startDate) + (req.endTime ? `T${req.endTime}` : "T20:20");
        return {
          ...req,
          id: `sim-${req.id}`,
          checkInTime: new Date(start).toISOString(),
          checkOutTime: new Date(end).toISOString(),
          type: "ABSENCE",
          absenceType: req.type
        };
      });

    return [...realEntries, ...mappedRequests];
  }, [entries, allRequests]);

  const filteredEntries = useMemo(() => {
    const horizon = subDays(new Date(), 7);

    return unifiedEntries
      .filter(entry => {
        if (entry.type !== "ABSENCE" && entry.companyId !== "default") return false;
        
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;

        // Limite temporale per pulizia (se non richiesto diversamente)
        if (!showAllHistory && !filterDate && entry.checkInTime) {
          if (new Date(entry.checkInTime) < horizon) return false;
        }

        // Filtro Nome
        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) return false;

        // Filtro Data
        if (filterDate && entry.checkInTime) {
          const entryDate = new Date(entry.checkInTime).toISOString().split('T')[0];
          if (entryDate !== filterDate) return false;
        }

        // Filtro Tipo
        if (filterType !== "all") {
          const type = entry.type || "MANUAL";
          if (filterType === "USER" && type !== "MANUAL") return false;
          if (filterType === "AUTO" && type !== "AUTO") return false;
          if (filterType === "ADMIN" && type !== "ADMIN") return false;
          if (filterType === "ABSENCE" && type !== "ABSENCE") return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const dateB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        return dateB - dateA;
      });
  }, [unifiedEntries, employeeMap, searchQuery, filterDate, filterType, showAllHistory]);

  // Raggruppamento per data per migliorare la leggibilità
  const groupedEntries = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredEntries.forEach(entry => {
      const dateKey = entry.checkInTime ? new Date(entry.checkInTime).toISOString().split('T')[0] : "no-date";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const handleAutoClockIn = async () => {
    const targetIds = autoParams.selectAll 
      ? activeEmployees.map(e => e.id) 
      : autoParams.selectedEmployees;

    if (targetIds.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona almeno un dipendente." });
      return;
    }

    setIsGenerating(true);
    
    try {
      let count = 0;
      const start = parseISO(autoParams.startDate);
      const end = parseISO(autoParams.endDate);
      
      for (let d = start; d <= end; d = addDays(d, 1)) {
        if (isSunday(d)) continue;

        const dateStr = format(d, 'yyyy-MM-dd');
        const dayOfWeekStr = d.getDay().toString();

        for (const empId of targetIds) {
          const emp = employeeMap[empId];
          if (!emp || emp.autoClockIn === false) continue;

          const isRestDay = dayOfWeekStr === emp.restDay;
          const rStart = emp.restStartTime || "00:00";
          const rEnd = emp.restEndTime || "00:00";

          if (emp.contractType === 'full-time') {
            const morningOverlaps = isRestDay && ("09:00" < rEnd && "13:00" > rStart);
            if (!morningOverlaps) {
              const idAM = `auto-${emp.id}-${dateStr}-MORNING`;
              const checkInAM = new Date(d); checkInAM.setHours(9, 0, 0);
              const checkOutAM = new Date(d); checkOutAM.setHours(13, 0, 0);
              setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idAM), {
                id: idAM, employeeId: emp.id, companyId: "default", checkInTime: checkInAM.toISOString(), checkOutTime: checkOutAM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO", slot: "MORNING"
              }, { merge: true });
              count++;
            }
          }

          const afternoonOverlaps = isRestDay && ("17:00" < rEnd && "20:20" > rStart);
          if (!afternoonOverlaps) {
            const idPM = `auto-${emp.id}-${dateStr}-AFTERNOON`;
            const checkInPM = new Date(d); checkInPM.setHours(17, 0, 0);
            const checkOutPM = new Date(d); checkOutPM.setHours(20, 20, 0);
            setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idPM), {
              id: idPM, employeeId: emp.id, companyId: "default", checkInTime: checkInPM.toISOString(), checkOutTime: checkOutPM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO", slot: "AFTERNOON"
            }, { merge: true });
            count++;
          }
        }
      }
      
      toast({ title: "Completato", description: `Generate ${count} timbrature.` });
      setIsAutoOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: "Problema durante la generazione." });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleForceEntry = () => {
    if (!newEntry.employeeId || !newEntry.date || !newEntry.checkIn) {
      toast({ variant: "destructive", title: "Errore", description: "Campi obbligatori mancanti." });
      return;
    }

    const entryId = `forced-${Date.now()}`;
    const checkInDateTime = new Date(`${newEntry.date}T${newEntry.checkIn}`);
    const checkOutDateTime = newEntry.checkOut ? new Date(`${newEntry.date}T${newEntry.checkOut}`) : null;

    setDocumentNonBlocking(doc(db, "employees", newEntry.employeeId, "timeentries", entryId), {
      id: entryId,
      employeeId: newEntry.employeeId,
      companyId: "default",
      checkInTime: checkInDateTime.toISOString(),
      checkOutTime: checkOutDateTime?.toISOString() || null,
      status: "PRESENT",
      isApproved: true,
      type: "ADMIN",
      slot: checkInDateTime.getHours() < 14 ? "MORNING" : "AFTERNOON"
    }, { merge: true });

    setIsForceOpen(false);
    toast({ title: "Timbratura Inserita" });
  }

  const handleUpdateEntry = () => {
    if (!editingEntry) return;

    const baseDate = new Date(editingEntry.checkInTime).toISOString().split('T')[0];
    const newCheckIn = new Date(`${baseDate}T${editingEntry.editIn}`);
    const newCheckOut = editingEntry.editOut ? new Date(`${baseDate}T${editingEntry.editOut}`) : null;

    if (editingEntry.type === "ABSENCE") {
      const requestId = editingEntry.id.replace("sim-", "");
      updateDocumentNonBlocking(doc(db, "employees", editingEntry.employeeId, "requests", requestId), {
        startDate: baseDate,
        startTime: editingEntry.editIn,
        endTime: editingEntry.editOut || "20:20",
        updatedAt: new Date().toISOString()
      });
    } else {
      updateDocumentNonBlocking(doc(db, "employees", editingEntry.employeeId, "timeentries", editingEntry.id), {
        checkInTime: newCheckIn.toISOString(),
        checkOutTime: newCheckOut?.toISOString() || null,
        type: "ADMIN",
        updatedAt: new Date().toISOString()
      });
    }

    setIsEditOpen(false);
    setEditingEntry(null);
    toast({ title: "Aggiornato" });
  }

  const handleDeleteEntry = (log: any) => {
    if (log.type === "ABSENCE") {
      const requestId = log.id.replace("sim-", "");
      deleteDocumentNonBlocking(doc(db, "employees", log.employeeId, "requests", requestId));
    } else {
      deleteDocumentNonBlocking(doc(db, "employees", log.employeeId, "timeentries", log.id));
    }
    toast({ title: "Eliminato" });
  }

  const getSourceBadge = (type: string, absenceType?: string) => {
    switch (type) {
      case 'ADMIN': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none font-bold text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> ADMIN</Badge>
      case 'AUTO': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold text-[10px] gap-1"><Zap className="h-3 w-3" /> AUTO</Badge>
      case 'ABSENCE': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-bold text-[10px] gap-1"><Umbrella className="h-3 w-3" /> ASSENZA</Badge>
      default: return <Badge className="bg-blue-100 text-[#227FD8] hover:bg-blue-100 border-none font-bold text-[10px] gap-1"><Fingerprint className="h-3 w-3" /> UTENTE</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">Registro Presenze</h1>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <History className="h-4 w-4" /> Archivio movimenti e gestione timbrature.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isForceOpen} onOpenChange={setIsForceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="font-bold border-[#227FD8] text-[#227FD8] hover:bg-blue-50 h-10 shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Inserimento Manuale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl uppercase">Timbratura Forzata</DialogTitle>
                <DialogDescription>Inserisci manualmente un record nel sistema.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Dipendente</Label>
                  <Select value={newEntry.employeeId} onValueChange={(v) => setNewEntry({...newEntry, employeeId: v})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Giorno</Label>
                  <Input type="date" className="h-11" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Ora Ingresso</Label>
                    <Input type="time" className="h-11" value={newEntry.checkIn} onChange={e => setNewEntry({...newEntry, checkIn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-xs text-slate-500">Ora Uscita</Label>
                    <Input type="time" className="h-11" value={newEntry.checkOut} onChange={e => setNewEntry({...newEntry, checkOut: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsForceOpen(false)} className="font-bold">Annulla</Button>
                <Button onClick={handleForceEntry} className="bg-[#227FD8] font-black px-10">SALVA</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAutoOpen} onOpenChange={setIsAutoOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 font-black h-10 shadow-md">
                <Zap className="h-4 w-4 mr-2" /> Genera Automatico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle className="font-black text-2xl uppercase">Configura Generazione</DialogTitle></DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <Label className="font-black uppercase text-xs text-slate-500">Intervallo</Label>
                  <div className="space-y-3">
                    <Input type="date" value={autoParams.startDate} onChange={e => setAutoParams({...autoParams, startDate: e.target.value})} />
                    <Input type="date" value={autoParams.endDate} onChange={e => setAutoParams({...autoParams, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-black uppercase text-xs text-slate-500">Team</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">TUTTI</span>
                      <Checkbox checked={autoParams.selectAll} onCheckedChange={(v) => setAutoParams({...autoParams, selectAll: !!v, selectedEmployees: !!v ? activeEmployees.map(e => e.id) : []})} />
                    </div>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto border rounded-lg p-2 bg-slate-50/50">
                    {activeEmployees.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-1">
                        <span className="text-xs font-bold">{e.firstName} {e.lastName}</span>
                        <Checkbox checked={autoParams.selectedEmployees.includes(e.id)} onCheckedChange={(v) => setAutoParams(p => ({...p, selectedEmployees: !!v ? [...p.selectedEmployees, e.id] : p.selectedEmployees.filter(i => i !== e.id), selectAll: false}))} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAutoClockIn} disabled={isGenerating} className="bg-amber-500 font-black px-10">AVVIA GENERAZIONE</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Cerca collaboratore..." className="pl-9 h-10 border-none bg-slate-50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Input type="date" className="h-10 border-none bg-slate-50" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 border-none bg-slate-50"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fonti</SelectItem>
                <SelectItem value="USER">Utente</SelectItem>
                <SelectItem value="AUTO">Automatiche</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ABSENCE">Assenze</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-10 font-bold" onClick={() => { setSearchQuery(""); setFilterDate(""); setFilterType("all"); setShowAllHistory(false); }}>Reset</Button>
              {!showAllHistory && !filterDate && (
                <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-tighter" onClick={() => setShowAllHistory(true)}>Mostra tutto lo storico</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {isLoadingEntries || isLoadingRequests ? (
            <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>
          ) : groupedEntries.length > 0 ? groupedEntries.map(([date, dayEntries]) => (
            <Card key={date} className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-200">
              <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm border">
                    <CalendarDays className="h-5 w-5 text-[#227FD8]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-[#1e293b]">
                      {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{dayEntries.length} movimenti registrati</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {dayEntries.map((log) => {
                      const emp = employeeMap[log.employeeId];
                      const cIn = log.checkInTime ? new Date(log.checkInTime) : null;
                      const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
                      const isAbsence = log.type === "ABSENCE";
                      
                      return (
                        <TableRow key={log.id} className={cn("h-14 border-b last:border-0 hover:bg-slate-50/30 group", isAbsence && "bg-rose-50/10")}>
                          <TableCell className="pl-6 w-[250px]">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp?.photoUrl} />
                                <AvatarFallback className="text-[10px] font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-[#1e293b] truncate w-32">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase truncate w-32">{emp?.jobTitle || "Collaboratore"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-black", isAbsence ? "text-rose-600" : "text-[#227FD8]")}>
                                {cIn?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-slate-300 text-[10px]">→</span>
                              <span className={cn("text-xs font-black", cOut ? (isAbsence ? "text-rose-600" : "text-slate-700") : "text-slate-300 italic")}>
                                {cOut ? cOut.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "In Corso"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(log.type, log.absenceType)}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                const cin = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "09:00";
                                const cout = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "";
                                setEditingEntry({ ...log, editIn: cin, editOut: cout });
                                setIsEditOpen(true);
                              }}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => handleDeleteEntry(log)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )) : (
            <Card className="py-20 text-center border-dashed"><p className="text-slate-400 font-bold italic">Nessun movimento trovato.</p></Card>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-[#227FD8]">
                <UserCheck className="h-4 w-4" /> La Tua Sessione
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4"><ClockInOut /></CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Info className="h-20 w-20" /></div>
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Info Legenda</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4 text-[11px] font-medium text-slate-400 relative z-10 leading-relaxed">
              <p>Il registro mostra di default gli ultimi <b>7 giorni</b> per mantenere l'interfaccia scattante.</p>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> <span><b>UTENTE</b>: Timbratura manuale da app.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" /> <span><b>AUTO</b>: Log generato da sistema.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-rose-500" /> <span><b>ASSENZA</b>: Copertura da ferie/permessi.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase">Modifica Orari</DialogTitle></DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-[10px] text-slate-500 uppercase">Inizio</Label>
                <Input type="time" className="h-11 text-lg font-black" value={editingEntry.editIn} onChange={e => setEditingEntry({...editingEntry, editIn: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] text-slate-500 uppercase">Fine</Label>
                <Input type="time" className="h-11 text-lg font-black" value={editingEntry.editOut} onChange={e => setEditingEntry({...editingEntry, editOut: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateEntry} className="bg-[#227FD8] font-black w-full h-11">AGGIORNA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
