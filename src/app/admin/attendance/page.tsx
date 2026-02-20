
"use client"

import { Clock, Search, Loader2, Zap, UserCheck, Plus, Edit, Trash2, Save, Filter, User, AlertTriangle, ShieldCheck, Fingerprint, Info, Check, X, Umbrella, Activity, Timer } from "lucide-react"
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
import { useState, useMemo } from "react"
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
import { format, addDays, parseISO, isSunday } from "date-fns"

export default function AttendancePage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  // Stati per i Filtri
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterEmployee, setFilterEmployee] = useState("all")
  const [filterType, setFilterType] = useState("all")
  
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
    }, {} as any);
  }, [employees]);

  const unifiedEntries = useMemo(() => {
    const realEntries = entries || [];
    
    // Mappa le richieste approvate come timbrature simulate
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
    return unifiedEntries
      .filter(entry => {
        // Se è una timbratura reale, controlla l'azienda
        if (entry.type !== "ABSENCE" && entry.companyId !== "default") return false;
        
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;

        // Filtro Nome
        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) return false;

        // Filtro Dipendente specifico
        if (filterEmployee !== "all" && entry.employeeId !== filterEmployee) return false;

        // Filtro Data
        if (filterDate && entry.checkInTime) {
          const entryDate = new Date(entry.checkInTime).toISOString().split('T')[0];
          if (entryDate !== filterDate) return false;
        }

        // Filtro Tipo (User, Auto, Admin, Absence)
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
  }, [unifiedEntries, employeeMap, searchQuery, filterDate, filterEmployee, filterType]);

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
      
      toast({ title: "Completato", description: `Generate ${count} timbrature per il periodo selezionato.` });
      setIsAutoOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Errore", description: "Si è verificato un problema durante la generazione." });
    } finally {
      setIsGenerating(false);
    }
  }

  const toggleEmployeeSelection = (id: string) => {
    setAutoParams(prev => {
      const isSelected = prev.selectedEmployees.includes(id);
      const newSelection = isSelected 
        ? prev.selectedEmployees.filter(sid => sid !== id)
        : [...prev.selectedEmployees, id];
      
      return { 
        ...prev, 
        selectedEmployees: newSelection,
        selectAll: newSelection.length === activeEmployees.length
      };
    });
  }

  const handleSelectAll = (checked: boolean) => {
    setAutoParams(prev => ({
      ...prev,
      selectAll: checked,
      selectedEmployees: checked ? activeEmployees.map(e => e.id) : []
    }));
  }

  const handleForceEntry = () => {
    if (!newEntry.employeeId || !newEntry.date || !newEntry.checkIn) {
      toast({ variant: "destructive", title: "Errore", description: "Dipendente, data e ora entrata obbligatori." });
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
    toast({ title: "Timbratura Inserita da Admin" });
  }

  const handleUpdateEntry = () => {
    if (!editingEntry) return;

    const baseDate = new Date(editingEntry.checkInTime).toISOString().split('T')[0];
    const newCheckIn = new Date(`${baseDate}T${editingEntry.editIn}`);
    const newCheckOut = editingEntry.editOut ? new Date(`${baseDate}T${editingEntry.editOut}`) : null;

    if (editingEntry.type === "ABSENCE") {
      // Se è un'assenza simulata, aggiorniamo il documento originale della richiesta
      const requestId = editingEntry.id.replace("sim-", "");
      updateDocumentNonBlocking(doc(db, "employees", editingEntry.employeeId, "requests", requestId), {
        startDate: baseDate,
        startTime: editingEntry.editIn,
        endTime: editingEntry.editOut || "20:20",
        updatedAt: new Date().toISOString(),
        adminNote: "Modificato da Admin dal Registro Presenze"
      });
      setIsEditOpen(false);
      setEditingEntry(null);
      toast({ title: "Assenza Aggiornata" });
      return;
    }

    updateDocumentNonBlocking(doc(db, "employees", editingEntry.employeeId, "timeentries", editingEntry.id), {
      checkInTime: newCheckIn.toISOString(),
      checkOutTime: newCheckOut?.toISOString() || null,
      type: "ADMIN",
      updatedBy: "ADMIN",
      updatedAt: new Date().toISOString()
    });

    setIsEditOpen(false);
    setEditingEntry(null);
    toast({ title: "Timbratura Aggiornata" });
  }

  const openEdit = (log: any) => {
    const cin = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "09:00";
    const cout = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "";
    setEditingEntry({ ...log, editIn: cin, editOut: cout });
    setIsEditOpen(true);
  }

  const handleDeleteEntry = (log: any) => {
    if (log.type === "ABSENCE") {
      // Se è un'assenza simulata, eliminiamo il documento originale della richiesta
      const requestId = log.id.replace("sim-", "");
      deleteDocumentNonBlocking(doc(db, "employees", log.employeeId, "requests", requestId));
      toast({ title: "Assenza / Permesso Eliminato" });
      return;
    }
    deleteDocumentNonBlocking(doc(db, "employees", log.employeeId, "timeentries", log.id));
    toast({ title: "Timbratura Eliminata" });
  }

  const getSourceBadge = (type: string, absenceType?: string) => {
    switch (type) {
      case 'ADMIN':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none font-black text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> ADMIN</Badge>
      case 'AUTO':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black text-[10px] gap-1"><Zap className="h-3 w-3" /> AUTO</Badge>
      case 'ABSENCE':
        const Icon = absenceType === 'SICK' ? Activity : absenceType === 'VACATION' ? Umbrella : Timer;
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-black text-[10px] gap-1"><Icon className="h-3 w-3" /> ASSENZA</Badge>
      default:
        return <Badge className="bg-blue-100 text-[#227FD8] hover:bg-blue-100 border-none font-black text-[10px] gap-1"><Fingerprint className="h-3 w-3" /> UTENTE</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">Registro Presenze</h1>
          <p className="text-sm text-muted-foreground font-medium">Archivio storico e gestione manuale delle timbrature.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isForceOpen} onOpenChange={setIsForceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="font-black border-[#227FD8] text-[#227FD8] hover:bg-blue-50 h-11 px-6 shadow-sm">
                <Plus className="h-5 w-5 mr-2" /> Inserimento Forzato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl uppercase">Timbratura Admin</DialogTitle>
                <DialogDescription>Inserisci manualmente un record di presenza nel sistema.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs text-slate-500">Seleziona Dipendente</Label>
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
                <Button onClick={handleForceEntry} className="bg-[#227FD8] font-black px-10 h-11 shadow-lg">CONFERMA E SALVA</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAutoOpen} onOpenChange={setIsAutoOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 font-black h-11 px-6 shadow-md">
                <Zap className="h-5 w-5 mr-2 fill-current" /> Genera Automatico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-black text-2xl uppercase flex items-center gap-2">
                  <Zap className="h-6 w-6 text-amber-500 fill-current" /> Configura Generazione
                </DialogTitle>
                <DialogDescription>Genera timbrature basate su contratti e riposi per il team selezionato.</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-xs text-slate-500">Intervallo Date</Label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400">DALLA DATA</Label>
                        <Input type="date" value={autoParams.startDate} onChange={e => setAutoParams({...autoParams, startDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400">ALLA DATA</Label>
                        <Input type="date" value={autoParams.endDate} onChange={e => setAutoParams({...autoParams, endDate: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                      <Info className="h-3 w-3 inline mr-1" /> Nota: Verranno ignorate le domeniche e i giorni di riposo specifici di ogni dipendente.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-black uppercase text-xs text-slate-500">Dipendenti Coinvolti</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">TUTTI</span>
                      <Checkbox checked={autoParams.selectAll} onCheckedChange={handleSelectAll} />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-1 bg-slate-50/50">
                    {activeEmployees.map(e => (
                      <div 
                        key={e.id} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer",
                          autoParams.selectedEmployees.includes(e.id) ? "bg-white shadow-sm ring-1 ring-amber-500/20" : "hover:bg-slate-100"
                        )}
                        onClick={() => toggleEmployeeSelection(e.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={e.photoUrl} />
                            <AvatarFallback className="text-[10px] font-bold">{e.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-slate-700">{e.firstName} {e.lastName}</span>
                        </div>
                        <Checkbox 
                          checked={autoParams.selectedEmployees.includes(e.id)} 
                          onCheckedChange={() => toggleEmployeeSelection(e.id)} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAutoOpen(false)} className="font-bold">Annulla</Button>
                <Button 
                  onClick={handleAutoClockIn} 
                  disabled={isGenerating}
                  className="bg-amber-500 hover:bg-amber-600 font-black px-10 h-11 shadow-lg gap-2"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  AVVIA GENERAZIONE
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cerca Collaboratore</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input placeholder="Nome o cognome..." className="pl-9 h-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Filtra per Data</Label>
              <Input type="date" className="h-10" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Origine Dato</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Tutte le fonti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le fonti</SelectItem>
                  <SelectItem value="USER">Inserite da Utente</SelectItem>
                  <SelectItem value="AUTO">Generate Automaticamente</SelectItem>
                  <SelectItem value="ADMIN">Forzate da Admin</SelectItem>
                  <SelectItem value="ABSENCE">Assenze / Permessi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="sm" className="h-10 font-bold text-slate-500" onClick={() => {
                setSearchQuery(""); setFilterDate(""); setFilterEmployee("all"); setFilterType("all");
              }}>Reset</Button>
              <div className="flex-1 text-right self-center pr-2">
                <span className="text-xs font-black text-[#227FD8] uppercase bg-blue-50 px-3 py-1.5 rounded-full">{filteredEntries.length} Risultati</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden ring-1 ring-slate-200">
          <CardHeader className="p-4 border-b bg-slate-50/50">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4 text-[#227FD8]" /> Elenco Movimenti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="h-12 border-none">
                  <TableHead className="text-[11px] font-black uppercase pl-6">Collaboratore</TableHead>
                  <TableHead className="text-[11px] font-black uppercase">Data</TableHead>
                  <TableHead className="text-[11px] font-black uppercase">Orario</TableHead>
                  <TableHead className="text-[11px] font-black uppercase">Origine</TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase pr-6">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEntries || isLoadingRequests ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredEntries.length > 0 ? filteredEntries.map((log) => {
                  const emp = employeeMap[log.employeeId];
                  const cIn = log.checkInTime ? new Date(log.checkInTime) : null;
                  const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
                  const isAbsence = log.type === "ABSENCE";
                  
                  return (
                    <TableRow key={log.id} className={cn(
                      "h-16 hover:bg-slate-50/50 group border-b last:border-0",
                      isAbsence ? "bg-rose-50/20" : ""
                    )}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                            <AvatarImage src={emp?.photoUrl} />
                            <AvatarFallback className="text-xs font-bold bg-slate-100">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-[#1e293b] leading-none">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                              {emp?.jobTitle || "Collaboratore"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">
                        {cIn?.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-black", isAbsence ? "text-rose-600" : "text-[#227FD8]")}>
                              {cIn?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className={cn("text-sm font-black", cOut ? (isAbsence ? "text-rose-600" : "text-slate-700") : "text-slate-300 italic")}>
                              {cOut ? cOut.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "In Corso"}
                            </span>
                          </div>
                          {log.isAnomaly && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-rose-600 uppercase">
                              <AlertTriangle className="h-2.5 w-2.5" /> Anomalia Oraria
                            </div>
                          )}
                          {isAbsence && (
                            <div className="text-[9px] font-black text-rose-500 uppercase">
                              {log.absenceType === 'VACATION' ? 'Ferie Approvate' : log.absenceType === 'SICK' ? 'Malattia' : 'Permesso'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(log.type, log.absenceType)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#227FD8] hover:border-[#227FD8] bg-white" onClick={() => openEdit(log)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:border-rose-600 bg-white" onClick={() => handleDeleteEntry(log)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center text-sm font-bold text-slate-400 uppercase italic">Nessun movimento trovato per questi filtri.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-amber-600">
                <UserCheck className="h-4 w-4" /> La Tua Sessione
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4"><ClockInOut /></CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Info className="h-20 w-20" /></div>
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Info Rapide</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4 relative z-10">
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Le timbrature <span className="text-rose-400 font-bold">ASSENZA</span> sono simulate automaticamente basandosi sulle richieste di ferie/permessi approvate.
              </p>
              <div className="h-px bg-slate-800" />
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Le timbrature con l'etichetta <span className="text-amber-400 font-bold">AUTO</span> sono generate basandosi sugli orari contrattuali e sui riposi settimanali impostati nell'anagrafica.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Modifica Timbratura / Assenza */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl uppercase tracking-tighter">
              {editingEntry?.type === 'ABSENCE' ? 'Modifica Assenza' : 'Correggi Orari'}
            </DialogTitle>
            <DialogDescription className="font-bold text-[#227FD8]">
              {editingEntry && employeeMap[editingEntry.employeeId] ? 
                `${employeeMap[editingEntry.employeeId].firstName} ${employeeMap[editingEntry.employeeId].lastName}` : 
                "Modifica"}
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-500">Ora Inizio / Ingresso</Label>
                <Input type="time" className="h-11 text-lg font-black" value={editingEntry.editIn} onChange={e => setEditingEntry({...editingEntry, editIn: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-500">Ora Fine / Uscita</Label>
                <Input type="time" className="h-11 text-lg font-black" value={editingEntry.editOut} onChange={e => setEditingEntry({...editingEntry, editOut: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleUpdateEntry} className="bg-[#227FD8] font-black h-11 px-8 gap-2 shadow-lg">
              <Save className="h-4 w-4" /> AGGIORNA E VALIDA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
