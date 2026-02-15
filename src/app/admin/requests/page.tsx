
"use client"

import { CheckCircle2, XCircle, Clock, Filter, MessageSquare, Loader2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, query, doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { useMemo } from "react"

export default function RequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()

  // Recupera tutti i dipendenti per mappare i nomi
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Recupera tutte le richieste dai sotto-collezioni dei dipendenti
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

  // Filtriamo solo le richieste di utenti esistenti e ordiniamo per data (più recenti prima)
  const validRequests = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter(req => employeeMap[req.employeeId])
      .sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [requests, employeeMap]);

  const handleUpdateStatus = (request: any, newStatus: string) => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "requests", request.id)
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    toast({
      title: newStatus === "Approvato" ? "Richiesta Approvata" : "Richiesta Rifiutata",
      description: `La richiesta di ${employeeMap[request.employeeId]?.firstName} è stata aggiornata.`,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Richieste Dipendenti</h1>
        <p className="text-muted-foreground">Gestisci ferie, permessi e malattie del tuo team reale.</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
            <p className="text-muted-foreground font-medium">Caricamento richieste in corso...</p>
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
                          <AvatarImage src={emp?.photoUrl || `https://picsum.photos/seed/${request.employeeId}/100/100`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> 
                            Inviata {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString('it-IT') : "Data non disponibile"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-muted/50 font-bold border-none px-3">
                          {request.type === 'VACATION' ? 'Ferie' : request.type === 'SICK' ? 'Malattia' : 'Permesso'}
                        </Badge>
                        <Badge 
                          variant={isPending ? "secondary" : "default"}
                          className={isApproved ? "bg-green-500 hover:bg-green-600" : isPending ? "" : "bg-destructive"}
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-xl border border-dashed mb-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">Periodo Richiesto</p>
                          <p className="font-bold text-[#1e293b]">
                            {request.startDate} {request.endDate ? `al ${request.endDate}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">Motivazione</p>
                          <p className="text-sm italic text-slate-600">"{request.reason || "Nessuna motivazione specificata"}"</p>
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground">
                          <MessageSquare className="h-4 w-4" /> Rispondi
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                          onClick={() => handleUpdateStatus(request, "Rifiutato")}
                        >
                          <XCircle className="h-4 w-4" /> Rifiuta
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
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                <Inbox className="h-8 w-8" />
              </div>
              <div className="text-center">
                <CardTitle className="text-xl font-bold text-[#1e293b]">Nessuna richiesta trovata</CardTitle>
                <CardDescription>Non ci sono richieste di ferie o permessi da parte dei dipendenti esistenti.</CardDescription>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
