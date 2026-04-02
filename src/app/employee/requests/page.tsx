"use client"

import { Plus, Clock, CheckCircle2, XCircle, Info, Loader2, MessageSquareText, Calendar, Timer, RefreshCw, Activity, Umbrella, Zap, History, User2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function MyRequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [newRequest, setNewRequest] = useState({
    type: "VACATION",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "13:00",
    targetEmployeeId: "",
    reason: ""
  })

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
    setDisplayName(localStorage.getItem("userName") || "Un dipendente")
  }, [])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "requests"),
      orderBy("submittedAt", "desc")
    );
  }, [db, employeeId])
  
  const { data: requests, isLoading } = useCollection(requestsQuery)

  const handleSubmitRequest = () => {
    if (!employeeId || !db || !newRequest.startDate) {
      toast({ variant: "destructive", title: "Errore", description: "La data è obbligatoria." })
      return;
    }

    if (newRequest.type === 'REST_SWAP' && !newRequest.targetEmployeeId) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona un collega per lo scambio." })
      return;
    }

    const requestId = `req-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "requests", requestId)
    
    setDocumentNonBlocking(requestRef, {
      id: requestId,
      employeeId: employeeId,
      ...newRequest,
      status: "In Attesa",
      submittedAt: new Date().toISOString()
    }, { merge: true })

    // Notifica per gli Admin
    const notifId = `notif-newreq-${Date.now()}`;
    let typeLabel = 'un Permesso';
    if (newRequest.type === 'VACATION') typeLabel = 'Ferie';
    if (newRequest.type === 'COMPENSATORY_REST') typeLabel = 'un Riposo Compensativo';
    
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: "ADMIN",
      title: "Nuova Richiesta",
      message: `${displayName} ha richiesto ${typeLabel} per il ${newRequest.startDate}.`,
      type: "NEW_REQUEST",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });

    setIsDialogOpen(false)
    setNewRequest({ 
      type: "VACATION", 
      startDate: "", 
      endDate: "", 
      startTime: "09:00", 
      endTime: "13:00", 
      targetEmployeeId: "", 
      reason: "" 
    })
    toast({ title: "Richiesta Inviata", description: "L'amministrazione è stata notificata." })
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'VACATION': return <Umbrella className="h-full w-full" />;
      case 'SICK': return <Activity className="h-full w-full" />;
      case 'PERSONAL': return <Calendar className="h-full w-full" />;
      case 'HOURLY_PERMIT': return <Timer className="h-full w-full" />;
      case 'REST_SWAP': return <RefreshCw className="h-full w-full" />;
      case 'COMPENSATORY_REST': return <Zap className="h-full w-full text-amber-500" />;
      default: return <Clock className="h-full w-full" />;
    }
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'VACATION': return 'Ferie';
      case 'SICK': return 'Malattia';
      case 'PERSONAL': return 'Permesso Giornaliero';
      case 'HOURLY_PERMIT': return 'Permesso Orario';
      case 'REST_SWAP': return 'Cambio Riposo';
      case 'COMPENSATORY_REST': return 'Riposo Compensativo';
      default: return type;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Time-Off & Assenze
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Gestione Richieste</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Calendar className="h-4 w-4" /> 
            Organizza il tuo riposo e i tuoi impegni
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
             <Button className="h-14 px-8 bg-[#1e293b] hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[1.2rem] shadow-xl transition-all hover:scale-[1.02] active:scale-95">
                <Plus className="h-4 w-4 mr-3" /> Crea Nuova Richiesta
             </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
             <div className="bg-[#1e293b] p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Umbrella className="h-20 w-20" />
                </div>
                <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-3">Assistente Richieste</Badge>
                <DialogTitle className="text-2xl font-black tracking-tighter italic">Compila Modulo</DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">L'amministrazione riceverà la notifica istantaneamente.</DialogDescription>
             </div>
             
             <div className="p-8 space-y-6">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipologia *</Label>
                   <Select value={newRequest.type} onValueChange={(v) => setNewRequest({...newRequest, type: v})}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]">
                         <SelectValue placeholder="Seleziona tipo..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                         <SelectItem value="VACATION" className="font-bold">Ferie</SelectItem>
                         <SelectItem value="PERSONAL" className="font-bold">Permesso Giornaliero</SelectItem>
                         <SelectItem value="HOURLY_PERMIT" className="font-bold">Permesso Orario</SelectItem>
                         <SelectItem value="SICK" className="font-bold">Malattia</SelectItem>
                         <SelectItem value="REST_SWAP" className="font-bold">Cambio Riposo</SelectItem>
                         <SelectItem value="COMPENSATORY_REST" className="font-bold">Riposo Compensativo</SelectItem>
                      </SelectContent>
                   </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data Inizio</Label>
                      <Input type="date" className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold" value={newRequest.startDate} onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})} />
                   </div>
                   {newRequest.type === 'VACATION' && (
                     <div className="space-y-2 text-rose-600">
                        <Label className="text-[10px] font-black uppercase text-rose-400 ml-1">Data Fine</Label>
                        <Input type="date" className="h-12 rounded-2xl border-rose-50 bg-rose-50/50 font-bold text-rose-900" value={newRequest.endDate} onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})} />
                     </div>
                   )}
                </div>

                {newRequest.type === 'HOURLY_PERMIT' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black text-blue-400 uppercase">Dalle ore</Label>
                        <Input type="time" className="h-11 rounded-xl border-white bg-white font-bold" value={newRequest.startTime} onChange={(e) => setNewRequest({...newRequest, startTime: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black text-blue-400 uppercase">Alle ore</Label>
                        <Input type="time" className="h-11 rounded-xl border-white bg-white font-bold" value={newRequest.endTime} onChange={(e) => setNewRequest({...newRequest, endTime: e.target.value})} />
                     </div>
                  </div>
                )}

                {newRequest.type === 'REST_SWAP' && (
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-[#227FD8] ml-1 flex items-center gap-2">
                        <User2 className="h-3 w-3" /> Scambia con collega
                     </Label>
                     <Select value={newRequest.targetEmployeeId} onValueChange={(v) => setNewRequest({...newRequest, targetEmployeeId: v})}>
                        <SelectTrigger className="h-12 rounded-2xl border-blue-50 bg-blue-50/50 font-bold">
                           <SelectValue placeholder="Scegli..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                           {employees?.filter(e => e.id !== employeeId).map(e => (
                              <SelectItem key={e.id} value={e.id} className="font-bold">{e.firstName} {e.lastName}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                )}

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Note (Opzionale)</Label>
                   <Textarea placeholder="Altre info..." className="rounded-2xl border-slate-100 bg-slate-50 min-h-[100px] font-medium" value={newRequest.reason} onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})} />
                </div>
             </div>

             <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest">Annulla</Button>
                <Button onClick={handleSubmitRequest} className="rounded-2xl h-14 bg-[#227FD8] hover:bg-[#1e293b] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl px-10">
                   Invia Richiesta <Zap className="h-4 w-4 ml-3 fill-current" />
                </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#1e293b] flex items-center gap-3">
             <History className="h-4 w-4 text-[#227FD8]" /> Registro Storico
           </h2>
           <Badge variant="outline" className="rounded-full border-slate-200 text-slate-400 text-[10px] font-bold px-3 py-1">ULTIME RICHIESTE</Badge>
        </div>

        {isLoading ? (
          <div className="py-32 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-100">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recupero archivio...</p>
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-4">
             {requests.map((req) => {
                const isApproved = req.status === 'Approvato' || req.status === 'APPROVED';
                const isRejected = req.status === 'Rifiutato' || req.status === 'REJECTED';
                const isPending = !isApproved && !isRejected;

                return (
                  <div key={req.id} className="group relative bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/20 transition-all duration-300">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                           <div className={cn(
                             "h-16 w-16 rounded-[1.5rem] p-4 shadow-lg transition-transform group-hover:rotate-6",
                             isApproved ? 'bg-green-500 text-white' : isRejected ? 'bg-rose-500 text-white' : 'bg-[#1e293b] text-white'
                           )}>
                              {getTypeIcon(req.type)}
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{getTypeLabel(req.type)}</p>
                              <h3 className="text-xl font-black text-[#1e293b] tracking-tighter italic flex items-center gap-3">
                                 {req.startDate} {req.endDate ? (<><ArrowRight className="h-4 w-4 text-slate-300" /> {req.endDate}</>) : ""}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                 {req.type === 'HOURLY_PERMIT' && (
                                   <Badge variant="outline" className="h-6 text-[9px] font-black text-[#227FD8] bg-blue-50 border-blue-100 uppercase px-3">
                                      <Timer className="h-3 w-3 mr-2" /> {req.startTime} - {req.endTime}
                                   </Badge>
                                 )}
                                 <Badge className={cn(
                                   "h-6 text-[9px] font-black uppercase tracking-widest border-none px-4",
                                   isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                 )}>
                                    {req.status}
                                 </Badge>
                              </div>
                           </div>
                        </div>

                        <div className="flex-1 max-w-md hidden xl:block">
                           {req.reason && (
                             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-xs italic font-medium text-slate-500 line-clamp-2 transition-all group-hover:line-clamp-none">
                                "{req.reason}"
                             </div>
                           )}
                        </div>

                        <div className="flex items-center gap-2">
                           {isPending && (
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => {/* Handle delete */}}>
                                 <XCircle className="h-5 w-5" />
                              </Button>
                           )}
                           <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-[#227FD8]/5 group-hover:text-[#227FD8] transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                     </div>
                     
                     {req.adminNote && (
                       <div className="mt-6 p-5 bg-rose-50 rounded-[1.5rem] border border-rose-100 flex gap-4 animate-in slide-in-from-top-2">
                          <div className="h-10 w-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-500/10">
                             <MessageSquareText className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Nota Amministrazione</p>
                             <p className="text-sm font-bold text-rose-900 leading-relaxed italic">"{req.adminNote}"</p>
                          </div>
                       </div>
                     )}
                  </div>
                )
             })}
          </div>
        ) : (
          <div className="py-40 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
             <div className="h-24 w-24 bg-white rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl border border-slate-100 mb-8">
               <Umbrella className="h-12 w-12 text-slate-100" />
             </div>
             <h3 className="text-2xl font-black text-[#1e293b] tracking-tight italic">Nessuna richiesta attiva</h3>
             <p className="text-slate-400 font-medium text-sm mt-3 max-w-xs mx-auto">
               Usa il tasto in alto per richiedere ferie, permessi o cambi riposo.
             </p>
          </div>
        )}
      </div>
    </div>
  )
}
