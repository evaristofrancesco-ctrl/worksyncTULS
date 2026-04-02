
"use client"

import { Clock, Search, Loader2, Zap, Plus, Edit, Trash2, CalendarDays, History, Fingerprint, ShieldCheck, Umbrella, ChevronRight, ArrowRight, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, doc, query, limit, orderBy } from "firebase/firestore"
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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO, subDays, isValid, isSameDay } from "date-fns"
import { it } from "date-fns/locale"

export default function AttendancePage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [showAllHistory, setShowAllHistory] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [formData, setFormData] = useState({
    employeeId: "",
    checkInDate: format(new Date(), "yyyy-MM-dd"),
    checkInTime: "09:00",
    checkOutDate: format(new Date(), "yyyy-MM-dd"),
    checkOutTime: "13:00",
    type: "ADMIN"
  })

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user])
  const { data: employees } = useCollection(employeesQuery)

  // Rimosso orderBy per evitare l'errore di indice mancante che bloccava la visualizzazione
  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collectionGroup(db, "timeentries"),
      limit(1000)
    );
  }, [db, user])
  const { data: entries, isLoading: isLoadingEntries } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "requests"), limit(300));
  }, [db, user])
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
    const mappedRequests = (allRequests || [])
      .filter(req => {
        const status = (req.status || "").toUpperCase();
        return (status === "APPROVATO" || status === "APPROVED" || status === "Approvato") && req.startDate;
      })
      .map(req => {
        try {
          const startStr = req.startDate + (req.startTime ? `T${req.startTime}` : "T09:00");
          const endStr = (req.endDate || req.startDate) + (req.endTime ? `T${req.endTime}` : "T20:20");
          const startDate = new Date(startStr);
          const endDate = new Date(endStr);
          
          if (!isValid(startDate)) return null;

          return {
            ...req,
            id: `sim-${req.id}`,
            checkInTime: startDate.toISOString(),
            checkOutTime: isValid(endDate) ? endDate.toISOString() : null,
            type: "ABSENCE",
            absenceType: req.type
          };
        } catch (e) {
          return null;
        }
      })
      .filter(r => r !== null);
    return [...realEntries, ...mappedRequests];
  }, [entries, allRequests]);

  const filteredEntries = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    return (unifiedEntries as any[])
      .filter(entry => {
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;
        
        if (!showAllHistory && !filterDate && !searchQuery) {
          const entryDate = entry.checkInTime ? entry.checkInTime.split('T')[0] : "";
          if (entryDate !== today) return false;
        }

        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) return false;
        
        if (filterDate && entry.checkInTime) {
          const entryDate = entry.checkInTime.split('T')[0];
          if (entryDate !== filterDate) return false;
        }

        if (filterType !== "all") {
          const type = entry.type || "MANUAL";
          if (filterType === "USER" && type !== "MANUAL" && type !== "USER") return false;
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

  const groupedEntries = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const entry of filteredEntries) {
      const dateKey = entry.checkInTime ? entry.checkInTime.split('T')[0] : "no-date";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);

  const handleAddEntry = () => {
    if (!formData.employeeId || !formData.checkInTime) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona collaboratore e orari." });
      return;
    }
    const id = `entry-adm-${Date.now()}`;
    const checkInDateObj = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
    const checkOutDateObj = formData.checkOutTime ? new Date(`${formData.checkOutDate}T${formData.checkOutTime}`) : null;
    
    if (!isValid(checkInDateObj)) {
      toast({ variant: "destructive", title: "Errore", description: "Data di inizio non valida." });
      return;
    }

    setDocumentNonBlocking(doc(db, "employees", formData.employeeId, "timeentries", id), {
      id, 
      employeeId: formData.employeeId, 
      companyId: "default", 
      checkInTime: checkInDateObj.toISOString(), 
      checkOutTime: checkOutDateObj && isValid(checkOutDateObj) ? checkOutDateObj.toISOString() : null, 
      type: "ADMIN", 
      status: "PRESENT", 
      isApproved: true
    }, { merge: true });
    
    setIsAddOpen(false);
    toast({ title: "Registrato", description: "Timbratura inserita correttamente." });
  }

  const handleEditClick = (log: any) => {
    setSelectedEntry(log);
    const cIn = new Date(log.checkInTime);
    const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
    
    setFormData({
      employeeId: log.employeeId,
      checkInDate: isValid(cIn) ? format(cIn, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      checkInTime: isValid(cIn) ? format(cIn, "HH:mm") : "09:00",
      checkOutDate: cOut && isValid(cOut) ? format(cOut, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      checkOutTime: cOut && isValid(cOut) ? format(cOut, "HH:mm") : "",
      type: log.type
    });
    setIsEditOpen(true);
  }

  const handleUpdateEntry = () => {
    if (!selectedEntry || !db) return;
    const checkInDateObj = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
    const checkOutDateObj = formData.checkOutTime ? new Date(`${formData.checkOutDate}T${formData.checkOutTime}`) : null;
    
    if (!isValid(checkInDateObj)) {
      toast({ variant: "destructive", title: "Errore", description: "Data di inizio non valida." });
      return;
    }

    updateDocumentNonBlocking(doc(db, "employees", selectedEntry.employeeId, "timeentries", selectedEntry.id), {
      checkInTime: checkInDateObj.toISOString(), 
      checkOutTime: checkOutDateObj && isValid(checkOutDateObj) ? checkOutDateObj.toISOString() : null, 
      updatedAt: new Date().toISOString()
    });
    
    setIsEditOpen(false);
    toast({ title: "Aggiornato", description: "Modifiche salvate." });
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

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'ADMIN': return <Badge className="bg-purple-100 text-purple-700 border-none font-bold text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> ADMIN</Badge>
      case 'AUTO': return <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[10px] gap-1"><Zap className="h-3 w-3" /> AUTO</Badge>
      case 'ABSENCE': return <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[10px] gap-1"><Umbrella className="h-3 w-3" /> ASSENZA</Badge>
      default: return <Badge className="bg-blue-100 text-[#227FD8] border-none font-bold text-[10px] gap-1"><Fingerprint className="h-3 w-3" /> UTENTE</Badge>
    }
  }

  const calculateDuration = (start: string, end: string | null) => {
    if (!start || !end) return null;
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (!isValid(s) || !isValid(e)) return null;
      const diffMs = e.getTime() - s.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } catch { return null; }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- REFINED HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Gestione Operativa
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter">Registro Presenze</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-3 w-3" /> 
            {showAllHistory || filterDate || searchQuery ? "Risultati filtrati" : "Monitoraggio odierno"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!showAllHistory && !filterDate && !searchQuery && (
            <Button variant="ghost" onClick={() => setShowAllHistory(true)} className="font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl hover:bg-slate-50 border border-slate-100">
              <History className="h-4 w-4 mr-2 text-[#227FD8]" /> Storico
            </Button>
          )}
          <Button onClick={() => setIsAddOpen(true)} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-12 px-8 rounded-2xl shadow-lg shadow-blue-500/20 text-[10px] uppercase tracking-widest">
            <Plus className="h-4 w-4 mr-2" /> Inserisci
          </Button>
        </div>
      </div>

      {/* --- NEW FILTER BAR --- */}
      <div className="bg-[#1e293b] p-3 rounded-3xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-[#227FD8]" />
            <Input 
              placeholder="Cerca collaboratore..." 
              className="pl-11 h-11 border-none bg-white/5 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#227FD8] transition-all" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="relative">
             <Input 
              type="date" 
              className="h-11 border-none bg-white/5 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#227FD8] [color-scheme:dark]" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-11 border-none bg-white/5 text-white rounded-2xl focus:ring-[#227FD8]">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl bg-[#1e293b] text-white">
              <SelectItem value="all">Tutti i movimenti</SelectItem>
              <SelectItem value="USER">Registrazioni Utente</SelectItem>
              <SelectItem value="AUTO">Registrazioni Auto</SelectItem>
              <SelectItem value="ADMIN">Inserimenti Admin</SelectItem>
              <SelectItem value="ABSENCE">Assenze e Ferie</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            className="h-11 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest" 
            onClick={() => { setSearchQuery(""); setFilterDate(""); setFilterType("all"); setShowAllHistory(false); }}
          >
            Reset Filtri
          </Button>
        </div>
      </div>

      {/* --- ACTIVITY STREAM --- */}
      <div className="space-y-10">
        {isLoadingEntries || isLoadingRequests ? (
          <div className="py-24 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Caricamento registro...</p>
          </div>
        ) : groupedEntries.length > 0 ? groupedEntries.map(([date, dayEntries]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#227FD8]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1e293b]">
                  {isSameDay(parseISO(date), new Date()) ? "OGGI • " : ""}
                  {format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dayEntries.map((log) => {
                const emp = employeeMap[log.employeeId];
                const cIn = log.checkInTime ? new Date(log.checkInTime) : null;
                const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
                const isAbsence = log.type === 'ABSENCE';
                const duration = calculateDuration(log.checkInTime, log.checkOutTime);
                const isInProgress = !cOut && !isAbsence;
                const isMorning = cIn && isValid(cIn) ? cIn.getHours() < 13 : true;
                const ShiftIcon = isMorning ? Sun : Moon;

                return (
                  <div key={log.id} className="group relative bg-white rounded-[2rem] p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/30 transition-all duration-500 overflow-hidden">
                    {/* Subtle Shift Accent */}
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full transition-all duration-500",
                      isAbsence ? "bg-slate-200" : isMorning ? "bg-amber-400" : "bg-indigo-500"
                    )} />

                    {/* Soft Glow Background */}
                    <div className={cn(
                      "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.07]",
                      isAbsence ? "bg-slate-400" : isMorning ? "bg-amber-400" : "bg-indigo-500"
                    )} />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={emp?.photoUrl} />
                            <AvatarFallback className="bg-[#1e293b] text-white font-black text-xs">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-[#1e293b] truncate leading-none">
                                {emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}
                              </p>
                              {!isAbsence && <ShiftIcon className={cn("h-3 w-3 opacity-30", isMorning ? "text-amber-500" : "text-indigo-500")} />}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{emp?.jobTitle || "Dipartimento"}</span>
                          </div>
                        </div>
                        {getSourceBadge(log.type)}
                      </div>

                      <div className={cn(
                        "rounded-2xl p-4 flex flex-col gap-3",
                        isAbsence ? "bg-rose-50" : isInProgress ? "bg-green-50/50" : "bg-slate-50"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Ingresso</p>
                            <p className="text-sm font-black text-[#1e293b]">{cIn && isValid(cIn) ? format(cIn, "HH:mm") : "--:--"}</p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <ArrowRight className={cn("h-3 w-3", isAbsence ? "text-rose-400" : "text-[#227FD8]")} />
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Uscita</p>
                            <p className={cn("text-sm font-black", isInProgress ? "text-green-600 animate-pulse" : "text-[#1e293b]")}>
                              {cOut && isValid(cOut) ? format(cOut, "HH:mm") : isInProgress ? "In Corso" : "--:--"}
                            </p>
                          </div>
                        </div>
                        
                        {duration && (
                          <div className="pt-2 border-t border-white/50 flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Durata Totale</span>
                            <Badge className="bg-white text-[#1e293b] border-none font-black text-[10px] shadow-sm">
                              {duration}
                            </Badge>
                          </div>
                        )}
                        {isAbsence && (
                          <div className="pt-2 border-t border-rose-100 flex justify-between items-center text-rose-700">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tipo Assenza</span>
                            <span className="text-[10px] font-black uppercase">{log.absenceType || "N/D"}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        {!isAbsence && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl h-9 font-black text-[9px] uppercase tracking-widest border-slate-200 hover:bg-[#1e293b] hover:text-white transition-all"
                            onClick={() => handleEditClick(log)}
                          >
                            <Edit className="h-3 w-3 mr-1.5" /> Modifica
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl h-9 font-black text-[9px] uppercase tracking-widest text-rose-500 hover:bg-rose-50 w-12"
                          onClick={() => handleDeleteEntry(log)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )) : (
          <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6 group hover:rotate-12 transition-transform">
              <CalendarDays className="h-10 w-10 text-slate-200 group-hover:text-[#227FD8]" />
            </div>
            <h3 className="text-xl font-black text-[#1e293b] tracking-tight">Nessun movimento trovato</h3>
            <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">
              Non ci sono registrazioni che corrispondono ai filtri attuali.
            </p>
            <Button 
              variant="outline" 
              className="mt-8 rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest border-slate-200 px-8"
              onClick={() => { setSearchQuery(""); setFilterDate(""); setFilterType("all"); setShowAllHistory(false); }}
            >
              Reset di tutti i filtri
            </Button>
          </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-[#1e293b] p-8 text-white">
            <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-4">Storage Admin</Badge>
            <DialogTitle className="text-3xl font-black tracking-tighter italic">Nuova Timbratura</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium mt-1">Registra manualmente un ingresso o un'uscita.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Scegli Collaboratore</Label>
              <Select value={formData.employeeId} onValueChange={(v) => setFormData({...formData, employeeId: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  {employees?.map(e => <SelectItem key={e.id} value={e.id} className="font-bold">{e.firstName} {e.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Data Inizio</Label>
                <Input type="date" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Ora Inizio</Label>
                <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkInTime} onChange={e => setFormData({...formData, checkInTime: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Data Fine</Label>
                <Input type="date" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkOutDate} onChange={e => setFormData({...formData, checkOutDate: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Ora Fine</Label>
                <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkOutTime} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} />
              </div>
            </div>
            
            <DialogFooter className="flex-col md:flex-row gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex-1">Chiudi</Button>
              <Button onClick={handleAddEntry} className="rounded-2xl h-14 bg-[#1e293b] hover:bg-black font-black text-[10px] uppercase tracking-widest flex-1 px-8">Salva Record</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-[#227FD8] p-8 text-white">
            <Badge className="bg-white/20 border-none font-black text-[9px] uppercase tracking-widest mb-4">Editing Session</Badge>
            <DialogTitle className="text-3xl font-black tracking-tighter italic">Aggiorna Record</DialogTitle>
            <DialogDescription className="text-blue-100 font-medium mt-1">Modifica gli orari di ingresso o uscita del collaboratore.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Data Inizio</Label>
                <Input type="date" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Ora Inizio</Label>
                <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkInTime} onChange={e => setFormData({...formData, checkInTime: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Data Fine</Label>
                <Input type="date" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkOutDate} onChange={e => setFormData({...formData, checkOutDate: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Ora Fine</Label>
                <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={formData.checkOutTime} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} />
              </div>
            </div>
            
            <DialogFooter className="flex-col md:flex-row gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex-1">Annulla</Button>
              <Button onClick={handleUpdateEntry} className="rounded-2xl h-14 bg-[#227FD8] hover:bg-blue-600 font-black text-[10px] uppercase tracking-widest flex-1 px-8">Salva Modifiche</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
