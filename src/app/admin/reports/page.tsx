
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
  Grid3X3,
  Star,
  Sparkles,
  Users,
  Clock,
  ClipboardList,
  Zap
} from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
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
import { collection, collectionGroup, query, limit } from "firebase/firestore"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, isValid, isSameDay } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { sendReportEmail } from "@/ai/flows/send-report-flow"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { 
  calculateMonthlyReportsData, 
  generateExcelHTML, 
  formatMinutesToDisplay 
} from "@/lib/report-utils"

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
    return query(collectionGroup(db, "timeentries"), limit(10000));
  }, [db, user])
  const { data: allEntries, isLoading: entriesLoading } = useCollection(timeEntriesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "requests"), limit(1000));
  }, [db, user])
  const { data: allRequests, isLoading: requestsLoading } = useCollection(requestsQuery)

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collectionGroup(db, "shifts"), limit(5000));
  }, [db, user])
  const { data: allShifts, isLoading: shiftsLoading } = useCollection(shiftsQuery)

  const holidaysQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "holidays");
  }, [db])
  const { data: allHolidays } = useCollection(holidaysQuery)



  const processedData = useMemo(() => {
    if (!employees || !allEntries || !allRequests || !allShifts || !allHolidays) {
      return { summary: [], dailyGrid: [], monthDays: [], totals: { theo: 0, worked: 0, absence: 0, net: 0 } };
    }
    return calculateMonthlyReportsData({
      employees,
      allEntries,
      allRequests,
      allShifts,
      allHolidays,
      selectedMonth,
      selectedYear
    });
  }, [employees, allEntries, allRequests, allShifts, allHolidays, selectedMonth, selectedYear]);

  const handleExportStyledExcel = () => {
    const selMonthLabel = MONTHS[parseInt(selectedMonth)].label;
    const content = generateExcelHTML(processedData, selMonthLabel, selectedYear);
    if (!content) return;
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_TU.L.S._${selMonthLabel}_${selectedYear}.xls`;
    link.click();
  };

  const handleSendEmail = async () => {
    if (!destEmail) return;
    setIsSending(true);
    try {
      const selMonthLabel = MONTHS[parseInt(selectedMonth)].label;
      const result = await sendReportEmail({
        recipientEmail: destEmail,
        monthLabel: selMonthLabel,
        year: selectedYear,
        fileContent: generateExcelHTML(processedData, selMonthLabel, selectedYear),
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
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      {/* --- HERO SECTION: REPLICATED FROM DASHBOARD --- */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#1e293b] p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-48 w-48 rounded-full bg-[#227FD8]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#227FD8] flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                  Conteggio <span className="text-[#227FD8]">Mensile</span>
                </h1>
                <p className="text-slate-400 font-medium text-sm">
                  Analisi presenze e assenze basata su log reali.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white font-black hover:bg-white/20 transition-all rounded-xl h-10 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem value={m.value} key={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] bg-white/10 border-white/20 text-white font-black hover:bg-white/20 transition-all rounded-xl h-10 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{yearsOptions.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
          </Select>
          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 font-bold text-white hover:bg-white/10 rounded-xl" onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 800); }} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-2 font-bold bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl shadow-sm" onClick={handleExportStyledExcel} disabled={isLoading}>
            <Download className="h-4 w-4" /> Esporta Excel
          </Button>
          <Button variant="default" size="sm" className="h-10 gap-2 font-black bg-[#227FD8] hover:bg-[#1e6fb9] text-white rounded-xl shadow-lg shadow-blue-500/20 px-6" onClick={() => setIsEmailOpen(true)} disabled={isLoading}>
            <Send className="h-4 w-4 text-white" /> Invia Report
          </Button>
        </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          title="Ore Lavorative" 
          value={`${processedData.totals?.theo.toFixed(1)}h`} 
          description="Quota Mensile Totale" 
          icon={Calculator} 
        />
        <StatCard 
          title="Ore Effettive" 
          value={`${processedData.totals?.worked.toFixed(1)}h`} 
          description="Lavoro Reale Team" 
          icon={Clock} 
        />
        <StatCard 
          title="Assenze" 
          value={`${processedData.totals?.absence.toFixed(1)}h`} 
          description="Ferie/Malattia/Permessi" 
          icon={ClipboardList} 
        />
        <StatCard 
          title="Saldo Netto" 
          value={`${processedData.totals?.net.toFixed(1)}h`} 
          description="Bilancio Mensile" 
          icon={Zap} 
          trend={processedData.totals?.net ? { value: Math.abs(Math.round(processedData.totals.net)), positive: processedData.totals.net >= 0 } : undefined}
        />
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
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[1.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Legenda codici</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-emerald-500 text-white flex items-center justify-center rounded text-[10px] font-black">F</div> <span className="text-[10px] font-bold text-slate-600">Ferie</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-400 text-white flex items-center justify-center rounded text-[10px] font-black">P</div> <span className="text-[10px] font-bold text-slate-600">Permesso</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center rounded text-[10px] font-black">M</div> <span className="text-[10px] font-bold text-slate-600">Malattia</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-purple-600 text-white flex items-center justify-center rounded text-[10px] font-black">S</div> <span className="text-[10px] font-bold text-slate-600">Straordinario</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-600 text-white flex items-center justify-center rounded text-[10px] font-black">R</div> <span className="text-[10px] font-bold text-slate-600">Riposo</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-amber-500 text-white flex items-center justify-center rounded text-[10px] font-black">RC</div> <span className="text-[10px] font-bold text-slate-600">Riposo Comp.</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-amber-200 text-amber-900 flex items-center justify-center rounded text-[10px] font-black">FES</div> <span className="text-[10px] font-bold text-slate-600">Festivo</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 bg-amber-100 border border-amber-300 rounded"></div> <span className="text-[10px] font-bold text-slate-600">Permesso orario</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Presenze Giornaliere</h2>
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
                        {processedData.monthDays.map((day, idx) => {
                          const isSun = day.getDay() === 0;
                          const isHoliday = allHolidays?.some((h: any) => h.date === format(day, 'yyyy-MM-dd'));
                          return (
                            <TableHead key={idx} 
                              className={cn(
                                "w-10 text-center p-0 text-[10px] font-black uppercase border-r",
                                isSun ? "" : isHoliday ? "bg-amber-400 text-amber-900" : "bg-slate-200 text-slate-500"
                              )}
                              style={isSun ? { backgroundColor: '#ef4444', color: '#ffffff' } : {}}
                            >
                              {format(day, 'eee', { locale: it })}
                            </TableHead>
                          );
                        })}
                        <TableHead className="w-24 text-center text-[10px] font-black uppercase border-l bg-slate-100">SOMMA ORE</TableHead>
                      </TableRow>
                      <TableRow className="h-10 hover:bg-transparent">
                        <TableHead className="w-[200px] border-r font-black text-[11px] uppercase bg-slate-50">Dipendente</TableHead>
                        {processedData.monthDays.map((day, idx) => {
                          const isSun = day.getDay() === 0;
                          const isHoliday = allHolidays?.some((h: any) => h.date === format(day, 'yyyy-MM-dd'));
                          return (
                            <TableHead key={idx} 
                              className={cn(
                                "w-10 text-center p-0 text-xs font-black border-r",
                                isSun ? "" : isHoliday ? "bg-amber-400 text-amber-900" : "bg-slate-300 text-slate-700"
                              )}
                              style={isSun ? { backgroundColor: '#ef4444', color: '#ffffff' } : {}}
                            >
                              {format(day, 'd')}
                            </TableHead>
                          );
                        })}
                        <TableHead className="w-24 border-l bg-slate-200"></TableHead>
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
                            const dStr = format(d.day, 'yyyy-MM-dd');
                            const isHoliday = allHolidays?.some((h: any) => h.date === dStr);
                            return (
                              <TableCell key={dIdx} 
                                className={cn(
                                  "w-10 p-0 text-center border-r transition-colors h-12",
                                  isSunday ? "" : isHoliday ? "bg-amber-100 text-amber-900" : "bg-white group-hover:bg-slate-50"
                                )}
                                style={isSunday ? { backgroundColor: '#ef4444', color: '#ffffff' } : {}}
                              >
                                {d.parts && d.parts.length > 0 && (
                                  <div className="flex flex-col h-full w-full">
                                    {d.parts.map((p: any, pIdx: number) => (
                                      <div key={pIdx} className={cn(
                                        "flex-1 flex items-center justify-center font-black text-[9px] leading-tight",
                                        p.type === 'vacation' && "bg-emerald-500 text-white",
                                        p.type === 'sick' && "bg-blue-600 text-white",
                                        p.type === 'rest' && (isSunday ? "text-white font-black" : "bg-slate-600 text-white"),
                                        p.type === 'holiday' && "bg-amber-200 text-amber-900",
                                        p.type === 'compensatory_rest' && "bg-amber-500 text-white",
                                        p.type === 'overtime' && "bg-purple-600 text-white",
                                        p.type === 'permit' && (p.value === 'P' ? "bg-slate-400 text-white" : "bg-amber-100 text-amber-900 border-y border-amber-200"),
                                        p.type === 'work' && (isSunday ? "text-white" : "text-slate-700")
                                      )}>
                                        {p.value}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="w-24 text-center border-l bg-slate-300/50 font-black text-xs text-slate-900">
                            {formatMinutesToDisplay(row.totalWorkMinutesInMonth)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[1.5rem] overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-12">
                    <TableHead className="text-sm font-bold uppercase text-slate-500 pl-8">Collaboratore</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ore lavorative</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Ore Effettive</TableHead>
                    <TableHead className="text-sm font-bold uppercase text-slate-500 text-center">Assenze (h)</TableHead>
                    <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Differenza (Netto)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
                  ) : processedData.summary.length > 0 ? processedData.summary.map((row) => (
                    <TableRow key={row.id} className="h-16 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm"><AvatarImage src={row.photoUrl} /><AvatarFallback className="font-bold">{row.name.charAt(0)}</AvatarFallback></Avatar>
                          <div className="flex flex-col"><span className="font-bold text-slate-900">{row.name}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{row.jobTitle}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{row.theoreticalHoursStr}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{row.workedHoursStr}</TableCell>
                      <TableCell className="text-center font-bold text-red-500">{row.absenceHoursStr}</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={cn("text-lg font-black", parseFloat(row.totalNetStr) < 0 ? "text-red-600" : "text-emerald-600")}>
                          {parseFloat(row.totalNetStr) > 0 ? `+${row.totalNetStr}` : row.totalNetStr}
                        </span>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="h-40 text-center italic">Nessun dato trovato.</TableCell></TableRow>}
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
