
"use client"

import { Clock, Search, Loader2, Zap, Plus, Edit, Trash2, CalendarDays, History, Fingerprint, ShieldCheck, Umbrella } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, doc, query, orderBy, limit } from "firebase/firestore"
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
import { format, parseISO, subDays, isValid } from "date-fns"
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

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "timeentries"), orderBy("checkInTime", "desc"), limit(500));
  }, [db, user])
  const { data: entries, isLoading: isLoadingEntries } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "requests"), orderBy("submittedAt", "desc"), limit(200));
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
        return status === "APPROVATO" || status === "APPROVED";
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
    const horizon = subDays(new Date(), 30);
    return unifiedEntries
      .filter(entry => {
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;
        if (!showAllHistory && !filterDate && !searchQuery && entry.checkInTime) {
          const d = new Date(entry.checkInTime);
          if (isValid(d) && d < horizon) return false;
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
    const checkIn = new Date(`${formData.checkInDate}T${formData.checkInTime}`).toISOString();
    const checkOut = formData.checkOutTime ? new Date(`${formData.checkOutDate}T${formData.checkOutTime}`).toISOString() : null;
    setDocumentNonBlocking(doc(db, "employees", formData.employeeId, "timeentries", id), {
      id, employeeId: formData.employeeId, companyId: "default", checkInTime: checkIn, checkOutTime: checkOut, type: "ADMIN", status: "PRESENT", isApproved: true
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
    const checkIn = new Date(`${formData.checkInDate}T${formData.checkInTime}`).toISOString();
    const checkOut = formData.checkOutTime ? new Date(`${formData.checkOutDate}T${formData.checkOutTime}`).toISOString() : null;
    updateDocumentNonBlocking(doc(db, "employees", selectedEntry.employeeId, "timeentries", selectedEntry.id), {
      checkInTime: checkIn, checkOutTime: checkOut, updatedAt: new Date().toISOString()
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">Registro Presenze</h1>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2"><History className="h-4 w-4" /> Movimenti recenti del team.</p>
        </div>
        <Button variant="default" onClick={() => setIsAddOpen(true)} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-11 px-6 shadow-md"><Plus className="h-5 w-5 mr-2" /> Inserimento Manuale</Button>
      </div>

      <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input placeholder="Cerca collaboratore..." className="pl-9 h-10 border-none bg-slate-50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <Input type="date" className="h-10 border-none bg-slate-50" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 border-none bg-slate-50"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fonti</SelectItem><SelectItem value="USER">Utente</SelectItem><SelectItem value="AUTO">Automatiche</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="ABSENCE">Assenze</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="h-10 font-bold" onClick={() => { setSearchQuery(""); setFilterDate(""); setFilterType("all"); setShowAllHistory(false); }}>Reset</Button>{!showAllHistory && !filterDate && (<Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase" onClick={() => setShowAllHistory(true)}>Mostra Altro</Button>)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {isLoadingEntries || isLoadingRequests ? (<div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></div>) : groupedEntries.length > 0 ? groupedEntries.map(([date, dayEntries]) => (
          <Card key={date} className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-200">
            <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-xl shadow-sm border"><CalendarDays className="h-5 w-5 text-[#227FD8]" /></div><div><CardTitle className="text-sm font-black uppercase text-[#1e293b]">{format(parseISO(date), "EEEE d MMMM yyyy", { locale: it })}</CardTitle><p className="text-[10px] font-bold text-slate-400 uppercase">{dayEntries.length} movimenti</p></div></div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {dayEntries.map((log) => {
                    const emp = employeeMap[log.employeeId];
                    const cIn = log.checkInTime ? new Date(log.checkInTime) : null;
                    const cOut = log.checkOutTime ? new Date(log.checkOutTime) : null;
                    const isAbsence = log.type === 'ABSENCE';
                    return (
                      <TableRow key={log.id} className="h-14 border-b last:border-0 hover:bg-slate-50/30">
                        <TableCell className="pl-6 w-[250px]"><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={emp?.photoUrl} /><AvatarFallback className="text-[10px] font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback></Avatar><div className="flex flex-col"><span className="font-bold text-xs text-[#1e293b] truncate w-32">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</span><span className="text-[9px] font-bold text-slate-400 uppercase">{emp?.jobTitle || "Collaboratore"}</span></div></div></TableCell>
                        <TableCell><div className="flex items-center gap-2"><span className="text-xs font-black text-[#227FD8]">{cIn && isValid(cIn) ? cIn.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span><span className="text-slate-300 text-[10px]">→</span><span className="text-xs font-black text-slate-700">{cOut && isValid(cOut) ? cOut.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "In Corso"}</span></div></TableCell>
                        <TableCell>{getSourceBadge(log.type)}</TableCell>
                        <TableCell className="pr-6 text-right"><div className="flex justify-end gap-2">{!isAbsence && (<Button variant="ghost" size="icon" className="h-8 w-8 text-[#227FD8] hover:bg-blue-50" onClick={() => handleEditClick(log)}><Edit className="h-4 w-4" /></Button>)}<Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteEntry(log)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )) : (<Card className="py-20 text-center border-dashed border-2"><p className="text-slate-400 font-bold italic">Nessun movimento trovato.</p></Card>)}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase">Nuova Timbratura</DialogTitle><DialogDescription>Inserisci manualmente un record di presenza.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Collaboratore</Label><Select value={formData.employeeId} onValueChange={(v) => setFormData({...formData, employeeId: v})}><SelectTrigger className="h-11"><SelectValue placeholder="Seleziona..." /></SelectTrigger><SelectContent>{employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Giorno Inizio</Label><Input type="date" className="h-11" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} /></div><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Ora Inizio</Label><Input type="time" className="h-11" value={formData.checkInTime} onChange={e => setFormData({...formData, checkInTime: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Giorno Fine</Label><Input type="date" className="h-11" value={formData.checkOutDate} onChange={e => setFormData({...formData, checkOutDate: e.target.value})} /></div><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Ora Fine</Label><Input type="time" className="h-11" value={formData.checkOutTime} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} /></div></div></div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsAddOpen(false)} className="font-bold">Annulla</Button><Button onClick={handleAddEntry} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black px-8">SALVA RECORD</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase">Modifica Record</DialogTitle><DialogDescription>Correggi gli orari di ingresso o uscita.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Giorno Inizio</Label><Input type="date" className="h-11" value={formData.checkInDate} onChange={e => setFormData({...formData, checkInDate: e.target.value})} /></div><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Ora Inizio</Label><Input type="time" className="h-11" value={formData.checkInTime} onChange={e => setFormData({...formData, checkInTime: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Giorno Fine</Label><Input type="date" className="h-11" value={formData.checkOutDate} onChange={e => setFormData({...formData, checkOutDate: e.target.value})} /></div><div className="space-y-2"><Label className="font-bold text-xs uppercase text-slate-500">Ora Fine</Label><Input type="time" className="h-11" value={formData.checkOutTime} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} /></div></div></div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Annulla</Button><Button onClick={handleUpdateEntry} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black px-8">AGGIORNA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
