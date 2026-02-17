
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
  
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

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
      description: `La modifica di ${employeeMap[request.employeeId]?.firstName} è stata salvata.`,
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1e293b] flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-[#227FD8]" />
            Gestione Modifiche
          </h1>
          <p className="text-xs text-muted-foreground">Approvazione e storico settimanale delle movimentazioni.</p>
        </div>
        <Badge variant="outline" className="h-7 gap-1.5 bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-bold">
          <Calendar className="h-3 w-3" /> Auto-pulizia: 7 giorni
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 border shadow-sm h-10 p-1 mb-4">
          <TabsTrigger value="pending" className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#227FD8] data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5" /> Da Gestire ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-bold gap-1.5 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <History className="h-3.5 w-3.5" /> Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#227FD8]" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={true} />
            ))
          ) : (
            <EmptyState title="Nessuna richiesta pendente" description="Tutte le movimentazioni sono state gestite." />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : historyRequests.length > 0 ? (
            historyRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={false} />
            ))
          ) : (
            <EmptyState title="Storico vuoto" description="Le richieste gestite appariranno qui." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ModificationCard({ req, emp, onUpdate, isPending }: { req: any, emp: any, onUpdate: any, isPending: boolean }) {
  const isApproved = req.status === "APPROVED";
  
  if (!isPending) {
    return (
      <Card className="overflow-hidden border-none shadow-sm bg-white/60 hover:bg-white transition-colors">
        <div className="flex items-center p-3 gap-4">
          <div className={`w-1 h-8 rounded-full ${isApproved ? "bg-green-500" : "bg-rose-500"}`} />
          <Avatar className="h-7 w-7 opacity-80 border">
            <AvatarImage src={emp?.photoUrl} />
            <AvatarFallback className="text-[10px]">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
            <p className="text-[9px] text-muted-foreground">{new Date(req.submittedAt).toLocaleDateString('it-IT')} {new Date(req.submittedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-0.5 text-[9px] font-black uppercase tracking-tight">
            <span className="text-green-600">IN: {req.entra.name} ({req.entra.pieces})</span>
            <span className="text-rose-600">OUT: {req.esce.name} ({req.esce.pieces})</span>
          </div>
          <Badge className={`${isApproved ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"} border-none font-black text-[8px] px-2 py-0 h-5`}>
            {req.status}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white ring-1 ring-slate-200">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-3 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="text-xs">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}</h3>
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {new Date(req.submittedAt).toLocaleString('it-IT')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-rose-50 text-[10px] font-bold" onClick={() => onUpdate(req, "REJECTED")}>
              <XCircle className="h-3 w-3 mr-1" /> Rifiuta
            </Button>
            <Button size="sm" className="h-7 px-3 bg-green-600 hover:bg-green-700 text-[10px] font-bold" onClick={() => onUpdate(req, "APPROVED")}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Approva
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 divide-x">
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-green-600 mb-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span className="font-black uppercase text-[9px] tracking-widest">ENTRA</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#1e293b]">{req.entra.name}</p>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground font-mono bg-slate-100 px-1 rounded">{req.entra.barcode}</span>
                <span className="text-[10px] font-black text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Qta: {req.entra.pieces}</span>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="font-black uppercase text-[9px] tracking-widest">ESCE</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#1e293b]">{req.esce.name}</p>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground font-mono bg-slate-100 px-1 rounded">{req.esce.barcode}</span>
                <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Qta: {req.esce.pieces}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <Card className="border-none shadow-sm bg-white/40 py-12">
      <CardContent className="flex flex-col items-center justify-center gap-2">
        <Inbox className="h-10 w-10 text-muted-foreground/20" />
        <div className="text-center">
          <p className="text-sm font-bold text-[#1e293b]">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
