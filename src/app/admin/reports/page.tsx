
"use client"

import { useState, useMemo } from "react"
import { 
  Calculator, 
  Download, 
  Loader2,
  RefreshCw,
  Send,
  CalendarDays,
  FileSpreadsheet,
  Grid3X3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, query } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isValid } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { sendReportEmail } from "@/ai/flows/send-report-flow"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const MONTHS = [
  { label: "Gennaio", value: "0" },
  { label: "Febbraio", value: "1" },
  { label: "Marzo", value: "2" },
  { label: "Aprile", value: "3" },
  { label: "Maggio", value: "4" },
  { label: "Giugno", value: "5" },
  { label: "Luglio", value: "6" },
  { label: "Agosto", value: "7" },
  { label: "Settembre", value: "8" },
  { label: "Ottobre", value: "9" },
  { label: "Novembre", value: "10" },
  { label: "Dicembre", value: "11" },
]

export default function ReportsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [destEmail, setDestEmail] = useState("")

  const yearsOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let i = current - 2; i <= current + 1; i++) {
      years.push(i.toString())
    }
    return years.reverse()
  }, [])

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "employees");
  }, [db, user])
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery)

  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "timeentries");
  }, [db, user])
  const { data: allEntries, isLoading: entriesLoading } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "requests");
  }, [db, user])
  const { data: allRequests, isLoading: requestsLoading } = useCollection(requestsQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collectionGroup(db, "shifts");
  }, [db, user])
  const { data: allShifts, isLoading: shiftsLoading } = useCollection(shiftsQuery)

  // Funzione per convertire ore decimali nel formato Ore.Minuti (es. 7.33 -> 7.2)
  const formatTime = (decimalHours: number) => {
    if (!decimalHours || decimalHours <= 0) return "0";
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (m === 0) return h.toString();
    
    // Formattazione minuti: se 20 min, visualizza .2 come richiesto (7.2)
    // Se 5 min, visualizza .05 per evitare ambiguità
    const mStr = m < 10 ? `0${m}` : m.toString();
    const finalM = mStr.endsWith('0') ? mStr.substring(0, 1) : mStr;
    
    return `${h}.${finalM}`;
  };

  const processedData = useMemo(() => {
    if (!employees || !allEntries || !allRequests || !allShifts) return { summary: [], dailyGrid: [], monthDays: [], totalsByDay: [] };

    const selMonthInt = parseInt(selectedMonth);
    const selYearInt = parseInt(selectedYear);
    const monthStart = startOfMonth(new Date(selYearInt, selMonthInt, 1));
    const monthEnd = endOfMonth(new Date(selYearInt, selMonthInt, 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Mappe per accesso rapido
    const entriesMap = new Map();
    allEntries.forEach(e => {
      if (!e.checkInTime) return;
      const dateKey = e.checkInTime.split('T')[0];
      const key = `${e.employeeId}_${dateKey}`;
      const list = entriesMap.get(key) || [];
      list.push(e);
      entriesMap.set(key, list);
    });

    const requestsMap = new Map();
    allRequests.forEach(r => {
      const status = (r.status || "").toUpperCase();
      if (!(status === "APPROVATO" || status === "APPROVED" || status === "Approvato")) return;
      const key = r.employeeId;
      const list = requestsMap.get(key) || [];
      list.push(r);
      requestsMap.set(key, list);
    });

    const shiftsMap = new Map();
    allShifts.forEach(s => {
      if (!s.date) return;
      const key = `${s.employeeId}_${s.date}`;
      const list = shiftsMap.get(key) || [];
      list.push(s);
      shiftsMap.set(key, list);
    });

    const dailyGrid: any[] = [];
    const totalsByDay = new Array(daysInMonth.length).fill(0);

    const summary = employees.filter(emp => {
      const isFrancesco = emp.firstName?.toLowerCase() === 'francesco' && emp.lastName?.toLowerCase() === 'evaristo';
      return !isFrancesco;
    }).map(emp => {
      let totalWorkHours = 0;
      let totalDaysCount = 0;
      let vacationHours = 0;
      let sickHours = 0;
      let permitHours = 0;

      const rowDays = daysInMonth.map((day, idx) => {
        const dStr = format(day, 'yyyy-MM-dd');
        let cellValue: string | number = "";
        let cellType: 'work' | 'vacation' | 'sick' | 'permit' | 'rest' | 'none' = 'none';

        // 1. Ore effettive da timbrature
        let dayWork = 0;
        const dayEntries = entriesMap.get(`${emp.id}_${dStr}`) || [];
        dayEntries.forEach((e: any) => {
          if (e.checkInTime && e.checkOutTime) {
            const start = new Date(e.checkInTime);
            const end = new Date(e.checkOutTime);
            if (isValid(start) && isValid(end)) {
              const diff = (end.getTime() - start.getTime()) / 3600000;
              if (diff > 0) dayWork += diff;
            }
          }
        });

        // 2. Straordinari (OVERTIME) da pianificazione
        let dayOvertime = 0;
        const dayShifts = shiftsMap.get(`${emp.id}_${dStr}`) || [];
        dayShifts.filter((s: any) => s.type === 'OVERTIME').forEach((s: any) => {
          const start = new Date(s.startTime);
          const end = new Date(s.endTime);
          if (isValid(start) && isValid(end)) {
            const diff = (end.getTime() - start.getTime()) / 3600000;
            if (diff > 0) dayOvertime += diff;
          }
        });

        // 3. Assenze da richieste o pianificazione
        const empRequests = requestsMap.get(emp.id) || [];
        const req = empRequests.find((r: any) => r.startDate <= dStr && (r.endDate || r.startDate) >= dStr);

        if (req) {
          if (req.type === "VACATION") { cellValue = "F"; cellType = "vacation"; vacationHours += 8; }
          else if (req.type === "SICK") { cellValue = "M"; cellType = "sick"; sickHours += 8; }
          else if (req.type === "PERSONAL") { cellValue = "P"; cellType = "permit"; permitHours += 8; }
          else if (req.type === "HOURLY_PERMIT") {
            if (req.startTime && req.endTime) {
              const [h1, m1] = req.startTime.split(':').map(Number);
              const [h2, m2] = req.endTime.split(':').map(Number);
              const diff = (h2 + m2/60) - (h1 + m1/60);
              if (diff > 0) { cellValue = formatTime(diff); cellType = "permit"; permitHours += diff; }
            }
          }
        } else {
          const shiftAbs = dayShifts.find((s: any) => (s.type === 'ABSENCE' || s.type === 'SICK'));
          if (shiftAbs) {
            cellValue = shiftAbs.type === 'SICK' ? "M" : "F";
            cellType = shiftAbs.type === 'SICK' ? "sick" : "vacation";
            if (shiftAbs.type === 'SICK') sickHours += 8; else vacationHours += 8;
          }
        }

        // Se c'è lavoro reale o straordinario, prevale il numero ore
        const totalDayLavoro = dayWork + dayOvertime;
        if (totalDayLavoro > 0) {
          cellValue = formatTime(totalDayLavoro);
          cellType = 'work';
          totalWorkHours += totalDayLavoro;
          totalDaysCount++;
          totalsByDay[idx]++;
        } else if (cellValue) {
          totalDaysCount++;
          totalsByDay[idx]++;
        }

        return { day, value: cellValue, type: cellType };
      });

      dailyGrid.push({ emp, rowDays, totalDaysCount, totalWorkHours });

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        photoUrl: emp.photoUrl,
        jobTitle: emp.jobTitle,
        workedHours: totalWorkHours,
        vacationHours,
        sickHours,
        permitHours,
        totalNet: totalWorkHours
      };
    });

    return { summary, dailyGrid, monthDays: daysInMonth, totalsByDay };
  }, [employees, allEntries, allRequests, allShifts, selectedMonth, selectedYear]);

  const generateCSVContent = () => {
    const { summary } = processedData;
    if (!summary.length) return "";
    let csv = "REPORT RIEPILOGO MENSILE\n";
    csv += "Collaboratore;Ruolo;Ore Lavorate;Ferie;Malattia;Permessi;Totale Netto\n";
    summary.forEach(r => {
      csv += `${r.name};${r.jobTitle};${formatTime(r.workedHours)};${formatTime(r.vacationHours)};${formatTime(r.sickHours)};${formatTime(r.permitHours)};${formatTime(r.totalNet)}\n`;
    });
    return csv;
  }

  const handleExportCSV = () => {
    const csvContent = generateCSVContent();
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_TU.L.S._${MONTHS[parseInt(selectedMonth)].label}_${selectedYear}.csv`);
    link.click();
  };

  const handleSendEmail = async () => {
    if (!destEmail) return;
    setIsSending(true);
    try {
      const result = await sendReportEmail({
        recipientEmail: destEmail,
        monthLabel: MONTHS[parseInt(selectedMonth)].label,
        year: selectedYear,
        csvContent: generateCSVContent(),
        adminName: user?.displayName || "Amministrazione TU.L.S."
      });
      if (result.success) {
        toast({ title: "Email Inviata" });
        setIsEmailOpen(false);
      } else {
        toast({ variant: "destructive", title: "Errore Invio", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setIsSending(false);
    }
  }

  const isLoading = employeesLoading || entriesLoading || requestsLoading || shiftsLoading || isRefreshing;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <Calculator className="h-8 w-8 text-[#227FD8]" /> Conteggio Mensile
          </h1>
          <p className="text-slate-500 font-medium">Analisi presenze e assenze in formato tabellare.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-none font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>{yearsOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
          </Select>
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
          <Button variant="ghost" size="sm" className="h-10 gap-2 font-bold text-[#227FD8] hover:bg-blue-50" onClick={() => setIsRefreshing(true) || setTimeout(() => setIsRefreshing(false), 800)} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-[#227FD8] text-[#227FD8]" onClick={handleExportCSV} disabled={isLoading}>
            <Download className="h-4 w-4" /> Esporta
          </Button>
          <Button variant="default" size="sm" className="h-10 gap-2 font-black bg-[#227FD8] shadow-md" onClick={() => setIsEmailOpen(true)} disabled={isLoading}>
            <Send className="h-4 w-4" /> Invia Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 mb-6">
          <TabsTrigger value="grid" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <Grid3X3 className="h-4 w-4" /> Griglia Presenze
          </TabsTrigger>
          <TabsTrigger value="summary" className="px-8 font-black uppercase text-xs gap-2 data-[state=active]:bg-white">
            <FileSpreadsheet className="h-4 w-4" /> Riepilogo Mensile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <Card className="border-none shadow-sm overflow-hidden bg-[#F4F8FA]">
            <CardHeader className="p-6 pb-2">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Chiave tipo di assenza</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-emerald-500 text-white flex items-center justify-center rounded text-[10px] font-black">F</div> <span className="text-[10px] font-bold text-slate-600">Ferie</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-400 text-white flex items-center justify-center rounded text-[10px] font-black">P</div> <span className="text-[10px] font-bold text-slate-600">Permesso Giornaliero</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center rounded text-[10px] font-black">M</div> <span className="text-[10px] font-bold text-slate-600">Malattia</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-amber-200 border border-amber-300 rounded"></div> <span className="text-[10px] font-bold text-slate-600">Permesso orario</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Date Presenze e assenze</h2>
                  <span className="text-2xl font-black text-slate-400">{selectedYear}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[1200px]">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="h-10 hover:bg-transparent border-none">
                        <TableHead className="w-[200px] border-r"></TableHead>
                        {processedData.monthDays.map((day, idx) => (
                          <TableHead key={idx} className={cn(
                            "w-10 text-center p-0 text-[10px] font-black uppercase border-r",
                            day.getDay() === 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-500"
                          )}>
                            {format(day, 'eee', { locale: it })}
                          </TableHead>
                        ))}
                        <TableHead className="w-24 text-center text-[10px] font-black uppercase border-l bg-slate-100">Totale giorni</TableHead>
                        <TableHead className="w-24 text-center text-[10px] font-black uppercase bg-slate-100">SOMMA ORE</TableHead>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-transparent">
                        <TableHead className="w-[200px] border-r font-black text-[11px] uppercase bg-slate-50">Nome dipendente</TableHead>
                        {processedData.monthDays.map((day, idx) => (
                          <TableHead key={idx} className={cn(
                            "w-10 text-center p-0 text-xs font-black border-r",
                            day.getDay() === 0 ? "bg-rose-600 text-white" : "bg-slate-300 text-slate-700"
                          )}>
                            {format(day, 'd')}
                          </TableHead>
                        ))}
                        <TableHead className="w-24 border-l bg-slate-200"></TableHead>
                        <TableHead className="w-24 bg-slate-200"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.dailyGrid.map((row, rIdx) => (
                        <TableRow key={rIdx} className="h-12 hover:bg-slate-100 group border-b border-slate-200">
                          <TableCell className="w-[200px] border-r font-bold text-xs text-slate-700 bg-white">
                            {row.emp.firstName} {row.emp.lastName}
                          </TableCell>
                          {row.rowDays.map((d: any, dIdx: number) => {
                            const isSunday = d.day.getDay() === 0;
                            return (
                              <TableCell key={dIdx} className={cn(
                                "w-10 p-0 text-center border-r transition-colors",
                                isSunday ? "bg-rose-600/90" : "bg-white group-hover:bg-slate-50"
                              )}>
                                {d.value && (
                                  <div className={cn(
                                    "w-full h-full flex items-center justify-center font-black text-[10px]",
                                    d.type === 'vacation' && "bg-emerald-500 text-white",
                                    d.type === 'sick' && "bg-blue-600 text-white",
                                    d.type === 'permit' && d.value === 'P' && "bg-slate-400 text-white",
                                    d.type === 'permit' && d.value !== 'P' && "bg-amber-100 text-amber-900 border border-amber-200",
                                    d.type === 'work' && "text-slate-700"
                                  )}>
                                    {d.value}
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="w-24 text-center border-l bg-slate-300/50 font-black text-xs text-slate-700">
                            {row.totalDaysCount}
                          </TableCell>
                          <TableCell className="w-24 text-center bg-slate-300/50 font-black text-xs text-rose-600">
                            {formatTime(row.totalWorkHours)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totale Piè di Pagina */}
                      <TableRow className="h-12 bg-slate-400/30 hover:bg-slate-400/40">
                        <TableCell className="w-[200px] border-r font-black text-[11px] uppercase text-slate-700">
                          {format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1), 'MMMM', { locale: it })} Totale
                        </TableCell>
                        {processedData.totalsByDay.map((val, idx) => (
                          <TableCell key={idx} className="w-10 p-0 text-center border-r font-black text-xs text-slate-700">
                            {val > 0 ? val : ""}
                          </TableCell>
                        ))}
                        <TableCell className="w-24 border-l"></TableCell>
                        <TableCell className="w-24 text-center font-black text-xs text-slate-700">
                          {processedData.totalsByDay.reduce((a, b) => a + b, 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-12">
                    <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ferie (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Malattia (h)</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Permessi (h)</TableHead>
                    <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Ore Totali</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
                  ) : processedData.summary.length > 0 ? processedData.summary.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={row.photoUrl} /><AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback></Avatar>
                          <div className="flex flex-col"><span className="font-bold text-slate-900">{row.name}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{row.jobTitle}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{formatTime(row.vacationHours)}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{formatTime(row.sickHours)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{formatTime(row.permitHours)}</TableCell>
                      <TableCell className="text-right pr-8"><span className="text-lg font-black text-[#227FD8]">{formatTime(row.totalNet)}</span></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="h-40 text-center italic">Nessun dato trovato.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Invia Report Mensile</DialogTitle><DialogDescription>Spedisci il report completo a un indirizzo email.</DialogDescription></DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="font-bold text-xs uppercase text-slate-500">Email Destinatario</Label>
            <Input type="email" placeholder="es. consulente@tuls.it" className="h-12" value={destEmail} onChange={(e) => setDestEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEmailOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleSendEmail} disabled={isSending || !destEmail} className="bg-[#227FD8] font-black h-12 px-8">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} SPEDISCI REPORT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
