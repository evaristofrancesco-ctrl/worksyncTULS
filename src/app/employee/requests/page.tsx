
"use client"

import { Plus, Clock, CheckCircle2, XCircle, Info, Loader2, MessageSquareText, Calendar, Timer, RefreshCw, Activity, Umbrella } from "lucide-react"
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

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

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
    const typeLabel = newRequest.type === 'VACATION' ? 'Ferie' : 'un Permesso';
    
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
      case 'VACATION': return <Umbrella className="h-5 w-5" />;
      case 'SICK': return <Activity className="h-5 w-5" />;
      case 'PERSONAL': return <Calendar className="h-5 w-5" />;
      case 'HOURLY_PERMIT': return <Timer className="h-5 w-5" />;
      case 'REST_SWAP': return <RefreshCw className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  }

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'VACATION': return 'Ferie';
      case 'SICK': return 'Malattia';
      case 'PERSONAL': return 'Permesso Giornaliero';
      case 'HOURLY_PERMIT': return 'Permesso Orario';
      case 'REST_SWAP': return 'Cambio Riposo';
      default: return type;
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Le Mie Richieste</h1>
          <p className="text-muted-foreground text-sm">Gestisci ferie, permessi, malattia e cambi riposo.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] font-bold shadow-md h-12 px-8 uppercase">
              <Plus className="h-5 w-5" /> Nuova Richiesta
            </Button>
          </DialogTrigger>
          <DialogContent 
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-xl"
          >
            <DialogHeader className="bg-[#227FD8] p-6 text-white">
              <DialogTitle className="font-black text-xl uppercase tracking-tight">Invia Richiesta</DialogTitle>
              <DialogDescription className="text-blue-50">
                Compila i dettagli per l'amministrazione.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-sm uppercase text-slate-500">Tipo di Richiesta</Label>
                <Select value={newRequest.type} onValueChange={(v) => setNewRequest({...newRequest, type: v})}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Ferie</SelectItem>
                    <SelectItem value="PERSONAL">Permesso Giornaliero</SelectItem>
                    <SelectItem value="HOURLY_PERMIT">Permesso Orario</SelectItem>
                    <SelectItem value="SICK">Malattia</SelectItem>
                    <SelectItem value="REST_SWAP">Cambio Riposo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-sm uppercase text-slate-500">Data {newRequest.type === 'VACATION' ? 'Inizio' : 'Giorno'}</Label>
                  <Input 
                    type="date" 
                    className="h-11" 
                    value={newRequest.startDate} 
                    onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})} 
                  />
                </div>
                {newRequest.type === 'VACATION' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-sm uppercase text-slate-500">Data Fine</Label>
                    <Input 
                      type="date" 
                      className="h-11" 
                      value={newRequest.endDate} 
                      onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})} 
                    />
                  </div>
                )}
              </div>

              {newRequest.type === 'HOURLY_PERMIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-sm uppercase text-slate-500">Dalle ore</Label>
                    <Input 
                      type="time" 
                      className="h-11" 
                      value={newRequest.startTime} 
                      onChange={(e) => setNewRequest({...newRequest, startTime: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-sm uppercase text-slate-500">Alle ore</Label>
                    <Input 
                      type="time" 
                      className="h-11" 
                      value={newRequest.endTime} 
                      onChange={(e) => setNewRequest({...newRequest, endTime: e.target.value})} 
                    />
                  </div>
                </div>
              )}

              {newRequest.type === 'REST_SWAP' && (
                <div className="space-y-2">
                  <Label className="font-bold text-sm uppercase text-slate-500">Scambia con collega</Label>
                  <Select value={newRequest.targetEmployeeId} onValueChange={(v) => setNewRequest({...newRequest, targetEmployeeId: v})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Scegli un collega..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.filter(e => e.id !== employeeId).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-bold text-sm uppercase text-slate-500">Note Aggiuntive</Label>
                <Textarea 
                  placeholder="Inserisci eventuali dettagli..." 
                  value={newRequest.reason} 
                  onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})} 
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="bg-slate-50 p-6 border-t">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleSubmitRequest} className="bg-[#227FD8] font-black h-12 px-10 uppercase shadow-md">
                INVIA RICHIESTA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
            <p className="text-muted-foreground font-medium">Caricamento richieste...</p>
          </div>
        ) : requests && requests.length > 0 ? (
          requests.map((req) => {
            const isApproved = req.status === 'Approvato' || req.status === 'APPROVED';
            const isRejected = req.status === 'Rifiutato' || req.status === 'REJECTED';
            
            return (
              <Card key={req.id} className={`border-none shadow-sm transition-all overflow-hidden ${isRejected ? 'bg-rose-50/50' : 'bg-white'}`}>
                <div className="flex flex-col md:flex-row md:items-stretch">
                  <div className={`w-2 ${isApproved ? "bg-green-500" : isRejected ? "bg-rose-500" : "bg-amber-400"}`} />
                  <CardContent className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ${
                          isApproved ? 'bg-green-100 text-green-600' : 
                          isRejected ? 'bg-rose-100 text-rose-600' : 
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {getTypeIcon(req.type)}
                        </div>
                        <div>
                          <h3 className="font-black text-[#1e293b] text-xl uppercase tracking-tight">
                            {getTypeLabel(req.type)}
                          </h3>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              {req.startDate} {req.endDate ? `al ${req.endDate}` : ""}
                            </p>
                            {req.type === 'HOURLY_PERMIT' && req.startTime && (
                              <p className="text-xs font-black text-[#227FD8] flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {req.startTime} - {req.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={isApproved ? 'default' : 'secondary'}
                        className={`font-black px-6 py-1.5 uppercase tracking-wider text-sm ${
                          isApproved ? 'bg-green-500' : 
                          isRejected ? 'bg-rose-500 text-white' : 
                          'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {req.status}
                      </Badge>
                    </div>
                    
                    {req.reason && (
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <p className="text-[11px] text-slate-400 mb-1 font-black uppercase tracking-widest">La tua nota:</p>
                        <p className="text-sm italic text-slate-700 font-medium">"{req.reason}"</p>
                      </div>
                    )}

                    {req.adminNote && (
                      <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100">
                        <div className="flex items-center gap-2 mb-2 text-rose-700">
                          <MessageSquareText className="h-4 w-4" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Nota Amministrazione:</span>
                        </div>
                        <p className="text-sm font-bold text-rose-800 italic">"{req.adminNote}"</p>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="border-none shadow-sm bg-white/50 py-24 text-center">
            <CardContent className="flex flex-col items-center gap-4 opacity-40">
              <Info className="h-16 w-16 text-slate-300" />
              <div>
                <p className="text-xl font-bold text-[#1e293b]">Nessuna richiesta</p>
                <p className="text-sm font-medium">Le tue richieste appariranno qui una volta inviate.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
