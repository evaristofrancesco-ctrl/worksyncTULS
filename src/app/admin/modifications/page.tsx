
"use client"

import { useState, useMemo } from "react"
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Inbox, 
  ArrowDownLeft, 
  ArrowUpRight,
  User,
  Package
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

export default function AdminModificationsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  // Recupera tutti i dipendenti per mappare i nomi
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Recupera tutte le richieste di modifica dai sotto-collezioni dei dipendenti
  const modificationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "modifications");
  }, [db])
  const { data: modifications, isLoading } = useCollection(modificationsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  const sortedModifications = useMemo(() => {
    if (!modifications) return [];
    return [...modifications].sort((a, b) => {
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [modifications]);

  const handleUpdateStatus = (request: any, newStatus: string) => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "modifications", request.id)
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    toast({
      title: newStatus === "APPROVED" ? "Richiesta Approvata" : "Richiesta Rifiutata",
      description: `La modifica di ${employeeMap[request.employeeId]?.firstName} è stata aggiornata.`,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3">
          <ArrowLeftRight className="h-8 w-8 text-[#227FD8]" />
          Gestione Modifiche ENTRA/ESCE
        </h1>
        <p className="text-muted-foreground">Monitora e approva le movimentazioni pezzi richieste dal team.</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
            <p className="text-muted-foreground font-medium">Caricamento richieste di modifica...</p>
          </div>
        ) : sortedModifications.length > 0 ? (
          sortedModifications.map((req) => {
            const emp = employeeMap[req.employeeId];
            const isPending = req.status === "PENDING";
            const isApproved = req.status === "APPROVED";
            const isRejected = req.status === "REJECTED";
            
            return (
              <Card key={req.id} className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-stretch">
                  <div className={`w-2 ${isPending ? "bg-amber-400" : isApproved ? "bg-green-500" : "bg-destructive"}`} />
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> 
                            Inviata il {new Date(req.submittedAt).toLocaleString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={isPending ? "secondary" : "default"}
                        className={`${isApproved ? "bg-green-500" : isPending ? "bg-amber-100 text-amber-700" : "bg-destructive"} font-bold uppercase tracking-widest text-[10px] px-3 py-1`}
                      >
                        {req.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-dashed">
                      {/* ENTRA */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <ArrowDownLeft className="h-5 w-5" />
                          <span className="font-black uppercase text-xs tracking-widest">ENTRA</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                          <p className="text-sm font-black text-[#1e293b] flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" /> {req.entra.name}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-mono">{req.entra.barcode}</span>
                            <Badge variant="outline" className="font-black bg-green-50 text-green-700 border-green-200">Qta: {req.entra.pieces}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* ESCE */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-rose-600">
                          <ArrowUpRight className="h-5 w-5" />
                          <span className="font-black uppercase text-xs tracking-widest">ESCE</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                          <p className="text-sm font-black text-[#1e293b] flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" /> {req.esce.name}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-mono">{req.esce.barcode}</span>
                            <Badge variant="outline" className="font-black bg-rose-50 text-rose-700 border-rose-200">Qta: {req.esce.pieces}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold"
                          onClick={() => handleUpdateStatus(req, "REJECTED")}
                        >
                          <XCircle className="h-4 w-4" /> Rifiuta
                        </Button>
                        <Button 
                          size="sm" 
                          className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-sm"
                          onClick={() => handleUpdateStatus(req, "APPROVED")}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approva Modifica
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm py-24">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <Inbox className="h-16 w-16 text-muted-foreground/20" />
              <div className="text-center">
                <p className="text-xl font-bold text-[#1e293b]">Nessuna richiesta di modifica</p>
                <p className="text-sm text-muted-foreground">Le richieste di movimentazione ENTRA/ESCE appariranno qui.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
