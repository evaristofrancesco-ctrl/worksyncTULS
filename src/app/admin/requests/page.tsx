
"use client"

import { CheckCircle2, XCircle, Clock, MessageSquare, Loader2, Inbox, Send } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { useMemo, useState } from "react"
import { parseISO, format } from "date-fns"

export default function RequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [rejectingRequest, setRejectingRequest] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")

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

  const validRequests = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter(req => employeeMap[req.employeeId])
      .sort((a, b) => {
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [requests, employeeMap]);

  const handleUpdateStatus = (request: any, newStatus: string, note: string = "") => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "requests", request.id)
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      adminNote: note,
      updatedAt: new Date().toISOString()
    })

    if (newStatus === "Approvato") {
      // Sincronizzazione con Registro Presenze (Timbratura Simulata)
      const startDate = parseISO(request.startDate);
      const endDate = request.endDate ? parseISO(request.endDate) : startDate;
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const entryId = `entry-abs-req-${request.employeeId}-${dateStr}-${Date.now()}`;
        const entryRef = doc(db, "employees", request.employeeId, "timeentries", entryId);
        
        let checkIn, checkOut;
        if (request.type === 'HOURLY_PERMIT') {
          checkIn = new Date(`${dateStr}T${request.startTime || "09:00"}`);
          checkOut = new Date(`${dateStr}T${request.endTime || "13:00"}`);
        } else {
          checkIn = new Date(`${dateStr}T09:00`);
          checkOut = new Date(`${dateStr}T20:20`);
        }

        setDocumentNonBlocking(entryRef, {
          id: entryId,
          employeeId: request.employeeId,
          companyId: "default",
          checkInTime: checkIn.toISOString(),
          checkOutTime: checkOut.toISOString(),
          status: "PRESENT",
          isApproved: true,
          type: "ABSENCE",
          absenceType: request.type
        }, { merge: true });
      }
    }

    // Crea notifica per il dipendente
    const notifId = `notif-req-${Date.now()}`;
    const statusText = newStatus.toUpperCase();
    const typeLabel = request.type === 'VACATION' ? 'Ferie' : 'Permesso';
    
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: request.employeeId,
      title: `Richiesta ${statusText}`,
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Gestione Richieste</h1>
        <p className="text-muted-foreground">Monitora e gestisci ferie, permessi e feedback per il team.</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
            <p className="text-muted-foreground font-medium">Caricamento richieste...</p>
          </div>
        ) : validRequests.length > 0 ? (
          validRequests.map((request) => {
            const emp = employeeMap[request.employeeId];
            const isPending = request.status === "In Attesa" || request.status === "PENDING";
            const isApproved = request.status === "Approvato" || request.status === "APPROVED";
            
            return (
              <Card key={request.id} className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-stretch">
                  <div className={`w-2 ${isPending ? "bg-amber-400" : isApproved ? "bg-green-500" : "bg-destructive"}`} />
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> 
                            {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString('it-IT') : "Data N.D."}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-muted/50 font-bold border-none px-3 text-[10px]">
                          {request.type === 'VACATION' ? 'FERIE' : request.type === 'SICK' ? 'MALATTIA' : 'PERMESSO'}
                        </Badge>
                        <Badge 
                          variant={isPending ? "secondary" : "default"}
                          className={`${isApproved ? "bg-green-500" : isPending ? "bg-amber-100 text-amber-700" : "bg-destructive"} font-bold`}
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-xl border border-dashed mb-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">Periodo</p>
                          <p className="font-bold text-[#1e293b] text-sm">
                            {request.startDate} {request.endDate ? `al ${request.endDate}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">Note Dipendente</p>
                          <p className="text-xs italic text-slate-600">"{request.reason || "Nessuna nota"}"</p>
                        </div>
                      </div>
                      {request.adminNote && (
                        <div className="mt-3 pt-3 border-t border-muted/50">
                          <p className="text-[10px] font-black uppercase text-destructive mb-1 tracking-wider">Tua Nota di Rifiuto</p>
                          <p className="text-xs font-medium text-destructive/80 italic">"{request.adminNote}"</p>
                        </div>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                          onClick={() => setRejectingRequest(request)}
                        >
                          <XCircle className="h-4 w-4" /> Rifiuta con Nota
                        </Button>
                        <Button 
                          size="sm" 
                          className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-sm"
                          onClick={() => handleUpdateStatus(request, "Approvato")}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approva
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm py-20">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <Inbox className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-xl font-bold text-[#1e293b]">Nessuna richiesta</p>
                <p className="text-sm text-muted-foreground">Le richieste dei dipendenti appariranno qui.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!rejectingRequest} onOpenChange={() => setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black text-destructive">Rifiuta Richiesta</DialogTitle>
            <DialogDescription>
              Inserisci una motivazione per il rifiuto. Il dipendente potrà leggere questa nota nel suo portale.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Esempio: Purtroppo per quel periodo abbiamo già troppe assenze nel reparto..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingRequest(null)} className="font-bold">Annulla</Button>
            <Button 
              className="bg-destructive hover:bg-destructive/90 gap-2 font-black"
              onClick={async () => handleUpdateStatus(rejectingRequest, "Rifiutato", adminNote)}
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
