
"use client"

import { useState, useMemo, useEffect } from "react"
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
  Package,
  History,
  Trash2,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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

  // Logica di pulizia automatica (rimuove richieste > 7 giorni)
  useEffect(() => {
    if (!modifications || !db) return;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    modifications.forEach(req => {
      const submittedAt = new Date(req.submittedAt);
      if (submittedAt < oneWeekAgo) {
        const ref = doc(db, "employees", req.employeeId, "modifications", req.id);
        deleteDocumentNonBlocking(ref);
      }
    });
  }, [modifications, db]);

  const sortedModifications = useMemo(() => {
    if (!modifications) return [];
    return [...modifications].sort((a, b) => {
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [modifications]);

  const pendingRequests = sortedModifications.filter(m => m.status === "PENDING");
  const historyRequests = sortedModifications.filter(m => m.status !== "PENDING");

  const handleUpdateStatus = (request: any, newStatus: string) => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "modifications", request.id)
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    toast({
      title: newStatus === "APPROVED" ? "Richiesta Approvata" : "Richiesta Rifiutata",
      description: `La modifica di ${employeeMap[request.employeeId]?.firstName} è stata spostata nello storico.`,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-[#227FD8]" />
            Gestione Modifiche
          </h1>
          <p className="text-muted-foreground">Approvazione movimentazioni ENTRA/ESCE e storico settimanale.</p>
        </div>
        <Badge variant="outline" className="h-8 gap-2 bg-blue-50 text-blue-700 border-blue-200">
          <Calendar className="h-3.5 w-3.5" /> Auto-pulizia: 7 giorni
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-sm border shadow-sm h-12 p-1 mb-6">
          <TabsTrigger value="pending" className="font-bold gap-2 data-[state=active]:bg-[#227FD8] data-[state=active]:text-white">
            <Clock className="h-4 w-4" /> Da Gestire ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="font-bold gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <History className="h-4 w-4" /> Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={true} />
            ))
          ) : (
            <EmptyState title="Nessuna richiesta pendente" description="Le movimentazioni inviate dal team appariranno qui." />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-slate-400" /></div>
          ) : historyRequests.length > 0 ? (
            historyRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={false} />
            ))
          ) : (
            <EmptyState title="Storico vuoto" description="Le richieste gestite nell'ultima settimana appariranno qui." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ModificationCard({ req, emp, onUpdate, isPending }: { req: any, emp: any, onUpdate: any, isPending: boolean }) {
  const isApproved = req.status === "APPROVED";
  
  if (!isPending) {
    // Versione minimizzata per lo storico
    return (
      <Card className="overflow-hidden border-none shadow-sm bg-white/60 hover:bg-white transition-colors">
        <div className="flex items-center p-4 gap-4">
          <div className={`w-1 h-10 rounded-full ${isApproved ? "bg-green-500" : "bg-rose-500"}`} />
          <Avatar className="h-8 w-8 opacity-80">
            <AvatarImage src={emp?.photoUrl} />
            <AvatarFallback>{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(req.submittedAt).toLocaleDateString('it-IT')} - {new Date(req.submittedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] font-black uppercase text-green-600">Entra: {req.entra.name} ({req.entra.pieces})</span>
              <span className="text-[9px] font-black uppercase text-rose-600">Esce: {req.esce.name} ({req.esce.pieces})</span>
            </div>
            <Badge className={`${isApproved ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"} border-none font-black text-[9px]`}>
              {req.status}
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  // Versione estesa per le richieste da gestire
  return (
    <Card className="overflow-hidden border-none shadow-md bg-white">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <div className="w-2 bg-amber-400" />
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
            <Badge className="bg-amber-100 text-amber-700 font-bold uppercase tracking-widest text-[10px] px-3 py-1">
              IN ATTESA
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
            {/* ENTRA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <ArrowDownLeft className="h-5 w-5" />
                <span className="font-black uppercase text-xs tracking-widest">ENTRA</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-2 border border-green-100">
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
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-2 border border-rose-100">
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

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-destructive border-destructive/20 hover:bg-rose-50 font-bold"
              onClick={() => onUpdate(req, "REJECTED")}
            >
              <XCircle className="h-4 w-4" /> Rifiuta
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-green-600 hover:bg-green-700 font-bold shadow-md"
              onClick={() => onUpdate(req, "APPROVED")}
            >
              <CheckCircle2 className="h-4 w-4" /> Approva Modifica
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm py-20">
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <Inbox className="h-16 w-16 text-muted-foreground/20" />
        <div className="text-center">
          <p className="text-xl font-bold text-[#1e293b]">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
