
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
} from "@/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClockInOut } from "@/components/attendance/ClockInOut"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef } from "react"
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
  const [showAllHistory, setShowAllHistory] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isForceOpen, setIsForceOpen] = useState(false)
  const [isAutoOpen, setIsAutoOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)

  const [newEntry, setNewEntry] = useState({
    employeeId: "",
    date: new Date().toISOString().split('T')[0],
    checkIn: "09:00",
    checkOut: "13:00"
  })

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

  const activeEmployees = useMemo(() => employees?.filter(e => e.isActive) || [], [employees]);

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
        const emp = employeeMap[entry.employeeId];
        if (!emp) return false;

        if (!showAllHistory && !filterDate && entry.checkInTime) {
          if (new Date(entry.checkInTime) < horizon) return false;
        }

        const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) return false;

        if (filterDate && entry.checkInTime) {
          const entryDate = new Date(entry.checkInTime).toISOString().split('T')[0];
          if (entryDate !== filterDate) return false;
        }

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
    const targetIds = autoParams.selectAll ? activeEmployees.map(e => e.id) : autoParams.selectedEmployees;
    if (targetIds.length === 0) return;
    setIsGenerating(true);
    try {
      let count = 0;
      const start = parseISO(autoParams.startDate);
      const end = parseISO(autoParams.endDate);
      for (let d = start; d <= end; d = addDays(d, 1)) {
        if (isSunday(d)) continue;
        const dateStr = format(d, 'yyyy-MM-dd');
        for (const empId of targetIds) {
          const emp = employeeMap[empId];
          if (!emp || emp.autoClockIn === false) continue;
          const idAM = `auto-${emp.id}-${dateStr}-MORNING`;
          const checkInAM = new Date(d); checkInAM.setHours(9, 0, 0);
          const checkOutAM = new Date(d); checkOutAM.setHours(13, 0, 0);
          setDocumentNonBlocking(doc(db, "employees", emp.id, "timeentries", idAM), {
            id: idAM, employeeId: emp.id, companyId: "default", checkInTime: checkInAM.toISOString(), checkOutTime: checkOutAM.toISOString(), status: "PRESENT", isApproved: true, type: "AUTO"
          }, { merge: true });
          count++;
        }
      }
      toast({ title: "Completato", description: `Generate ${count} timbrature.` });
      setIsAutoOpen(false);
    } finally {
      setIsGenerating(false);
    }
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
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <History className="h-4 w-4" /> Archivio movimenti e gestione timbrature.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsForceOpen(true)} className="font-bold border-[#227FD8] text-[#227FD8] hover:bg-blue-50 h-10 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Inserimento Manuale
          </Button>
          <Button onClick={() => setIsAutoOpen(true)} className="bg-amber-500 hover:bg-amber-600 font-black h-10 shadow-md">
            <Zap className="h-4 w-4 mr-2" /> Genera Automatico
          </Button>
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
        <div className="lg:col-span-12 space-y-6">
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
                      
                      return (
                        <TableRow key={log.id} className="h-14 border-b last:border-0 hover:bg-slate-50/30 group">
                          <TableCell className="pl-6 w-[250px]">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp?.photoUrl} />
                                <AvatarFallback className="text-[10px] font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-[#1e293b] truncate w-32">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{emp?.jobTitle || "Collaboratore"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#227FD8]">
                                {cIn?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-slate-300 text-[10px]">→</span>
                              <span className="text-xs font-black text-slate-700">
                                {cOut ? cOut.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "In Corso"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(log.type)}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteEntry(log)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
      </div>
    </div>
  )
}
