
"use client"

import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Loader2, 
  Inbox, 
  Send,
  History,
  Calendar,
  Umbrella,
  Activity,
  Timer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { useMemo, useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function RequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [rejectingRequest, setRejectingRequest] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const cleanupPerformed = useRef(false)

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "requests");
  }, [db])
  const { data: requests, isLoading } = useCollection(requestsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Cleanup controllato: esegui solo una volta quando arrivano i dati
  useEffect(() => {
    if (!requests || !db || cleanupPerformed.current) return;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    requests.forEach(req => {
      const status = (req.status || "").toUpperCase();
      const isApproved = status === "APPROVATO" || status === "APPROVED" || status === "Approvato";
      
      if (req.submittedAt && new Date(req.submittedAt) < oneWeekAgo && !isApproved) {
        deleteDocumentNonBlocking(doc(db, "employees", req.employeeId, "requests", req.id));
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`Pulizia completata: rimosse ${deletedCount} vecchie richieste.`);
    }
    cleanupPerformed.current = true;
  }, [requests, db]);

  const pendingRequests = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter(req => {
        const status = (req.status || "").toUpperCase();
        return status === "PENDING" || status === "IN ATTESA";
      })
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [requests]);

  const historyRequests = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter(req => {
        const status = (req.status || "").toUpperCase();
        return status !== "PENDING" && status !== "IN ATTESA";
      })
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [requests]);

  const handleUpdateStatus = (request: any, newStatus: string, note: string = "") => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "requests", request.id)
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      adminNote: note,
      updatedAt: new Date().toISOString()
    })

    const notifId = `notif-req-${Date.now()}`;
    const typeLabel = request.type === 'VACATION' ? 'Ferie' : 'un Permesso';
    
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: request.employeeId,
      title: `Richiesta ${newStatus.toUpperCase()}`,
      message: `La tua richiesta di ${typeLabel} per il ${request.startDate} è stata ${newStatus.toLowerCase()}.`,
      type: "REQUEST_STATUS",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });

    toast({
      title: newStatus === "Approvato" ? "Richiesta Approvata" : "Richiesta Rifiutata",
      description: `La richiesta di ${employeeMap[request.employeeId]?.firstName} è stata aggiornata.`,
    })
    
    setRejectingRequest(null)
    setAdminNote("")
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'VACATION': return <Umbrella className="h-4 w-4" />;
      case 'SICK': return <Activity className="h-4 w-4" />;
      case 'HOURLY_PERMIT': return <Timer className="h-4 w-4" />;
      case 'REST_SWAP': return <RefreshCw className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">Gestione Richieste</h1>
          <p className="text-sm text-muted-foreground font-medium">Monitora ferie, permessi e assenze del team.</p>
        </div>
        <Badge variant="outline" className="h-8 gap-2 bg-blue-50 text-blue-700 border-blue-100 text-xs font-bold px-4">
          <Clock className="h-4 w-4" /> Conservazione: Approvate Sempre
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 border h-11 p-1 mb-6">
          <TabsTrigger value="pending" className="text-xs font-black uppercase px-6 h-9 data-[state=active]:bg-[#227FD8] data-[state=active]:text-white">
            Pendenti ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-black uppercase px-6 h-9 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <RequestCard 
                key={request.id} 
                request={request} 
                emp={employeeMap[request.employeeId]} 
                onApprove={() => handleUpdateStatus(request, "Approvato")}
                onReject={() => setRejectingRequest(request)}
                typeIcon={getTypeIcon(request.type)}
              />
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 text-muted-foreground">
              <Inbox className="h-12 w-12 opacity-20" />
              <p className="text-lg font-bold">Nessuna richiesta in attesa</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {historyRequests.map((request) => (
            <RequestCard 
              key={request.id} 
              request={request} 
              emp={employeeMap[request.employeeId]} 
              isHistory={true}
              typeIcon={getTypeIcon(request.type)}
            />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectingRequest} onOpenChange={() => setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black text-destructive">Rifiuta Richiesta</DialogTitle>
            <DialogDescription>
              Inserisci una motivazione per il rifiuto.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Esempio: Purtroppo per quel periodo abbiamo già troppe assenze..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingRequest(null)} className="font-bold">Annulla</Button>
            <Button 
              className="bg-destructive hover:bg-destructive/90 gap-2 font-black"
              onClick={() => handleUpdateStatus(rejectingRequest, "Rifiutato", adminNote)}
              disabled={!adminNote.trim()}
            >
              <Send className="h-4 w-4" /> Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RequestCard({ request, emp, onApprove, onReject, isHistory = false, typeIcon }: { request: any, emp: any, onApprove?: any, onReject?: any, isHistory?: boolean, typeIcon: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = (request.status || "").toUpperCase();
  const isApproved = status === "APPROVATO" || status === "APPROVED" || status === "Approvato";
  const isRejected = status === "RIFIUTATO" || status === "REJECTED" || status === "Rifiutato";

  if (isHistory) {
    return (
      <Card 
        className={cn(
          "overflow-hidden border-none shadow-sm ring-1 ring-slate-200 transition-all cursor-pointer hover:bg-white bg-white/60",
          isExpanded && "bg-white ring-slate-300"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex">
          <div className={cn("w-1.5 shrink-0", isApproved ? "bg-green-500" : "bg-rose-500")} />
          <div className="flex-1">
            <div className="flex items-center p-3 gap-4">
              <Avatar className="h-8 w-8 border shadow-sm">
                <AvatarImage src={emp?.photoUrl} />
                <AvatarFallback className="text-[10px] font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1e293b] truncate">
                  {emp ? `${emp.firstName} ${emp.lastName}` : "Dipendente"}
                </p>
                <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  {request.startDate} {request.endDate ? `al ${request.endDate}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase border-none bg-slate-100 text-slate-500 gap-1">
                  {typeIcon} {request.type}
                </Badge>
                <Badge className={cn(
                  "h-5 px-2 text-[8px] font-black uppercase border-none",
                  isApproved ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                )}>
                  {request.status}
                </Badge>
                <ChevronDown className={cn("h-4 w-4 text-slate-300 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-dashed space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Periodo Richiesto</p>
                      <p className="text-xs font-bold text-slate-700">{request.startDate} {request.endDate ? `al ${request.endDate}` : ""}</p>
                    </div>
                    {request.submittedAt && (
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Inviata il</p>
                        <p className="text-xs font-bold text-slate-700">{new Date(request.submittedAt).toLocaleDateString('it-IT')}</p>
                      </div>
                    )}
                  </div>
                  
                  {request.reason && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Nota Dipendente</p>
                      <p className="text-xs italic text-slate-600">"{request.reason}"</p>
                    </div>
                  )}

                  {request.adminNote && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[9px] font-black uppercase text-rose-600 mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Nota Amministrazione
                      </p>
                      <p className="text-xs font-medium text-rose-800 italic">"{request.adminNote}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-200 bg-white">
      <div className="flex">
        <div className="w-1.5 shrink-0 bg-amber-400" />
        <div className="flex-1 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarImage src={emp?.photoUrl} />
                <AvatarFallback className="font-bold text-xs">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-sm text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase">
                  <span>{new Date(request.submittedAt).toLocaleDateString('it-IT')}</span>
                  <span className="opacity-20">|</span>
                  <span className="flex items-center gap-1">{typeIcon} {request.type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="font-black text-[10px] uppercase px-3 py-1 bg-amber-100 text-amber-700 border-none">
                {request.status}
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs font-black border-rose-200 text-rose-600 hover:bg-rose-50" onClick={onReject}>RIFIUTA</Button>
                <Button size="sm" className="h-8 text-xs font-black bg-green-600 hover:bg-green-700" onClick={onApprove}>APPROVA</Button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50/50 rounded-xl border border-dashed flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Periodo Richiesto</p>
              <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-[#227FD8]" />
                {request.startDate} {request.endDate ? `al ${request.endDate}` : ""}
                {request.type === 'HOURLY_PERMIT' && ` (${request.startTime}-${request.endTime})`}
              </div>
            </div>
            {request.reason && (
              <div className="flex-1 md:max-w-[300px]">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Nota Dipendente</p>
                <p className="text-xs italic text-slate-600 truncate">"{request.reason}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
