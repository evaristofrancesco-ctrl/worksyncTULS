
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
  History,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, doc } from "firebase/firestore"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

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
      if (new Date(req.submittedAt) < oneWeekAgo) {
        deleteDocumentNonBlocking(doc(db, "employees", req.employeeId, "modifications", req.id));
      }
    });
  }, [modifications, db]);

  const pendingRequests = useMemo(() => modifications?.filter(m => m.status === "PENDING").sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)) || [], [modifications]);
  const historyRequests = useMemo(() => modifications?.filter(m => m.status !== "PENDING").sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)) || [], [modifications]);

  const handleUpdateStatus = (request: any, newStatus: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "employees", request.employeeId, "modifications", request.id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
    toast({ title: newStatus === "APPROVED" ? "Approvata" : "Rifiutata" })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1e293b] flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-[#227FD8]" /> Gestione Entra/Esce
          </h1>
          <p className="text-sm text-muted-foreground">Approvazione movimentazioni articoli inviate dai dipendenti.</p>
        </div>
        <Badge variant="outline" className="h-8 gap-2 bg-blue-50 text-blue-700 border-blue-100 text-xs font-bold px-4">
          <Calendar className="h-4 w-4" /> Auto-pulizia: 7 giorni
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 border h-11 p-1 mb-6">
          <TabsTrigger value="pending" className="text-xs font-black uppercase px-6 h-9 data-[state=active]:bg-[#227FD8] data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2" /> Pendenti ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-black uppercase px-6 h-9 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <History className="h-4 w-4 mr-2" /> Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={true} />
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 text-muted-foreground">
              <Inbox className="h-12 w-12 opacity-20" />
              <p className="text-lg font-bold">Nessuna richiesta in attesa</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {historyRequests.map((req) => (
            <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={false} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ModificationCard({ req, emp, onUpdate, isPending }: { req: any, emp: any, onUpdate: any, isPending: boolean }) {
  const isApproved = req.status === "APPROVED";
  
  if (!isPending) {
    return (
      <Card className="border-none shadow-sm bg-white/60 hover:bg-white transition-all overflow-hidden">
        <div className="flex items-center p-4 gap-4">
          <div className={`w-1.5 h-10 rounded-full ${isApproved ? "bg-green-500" : "bg-rose-500"}`} />
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={emp?.photoUrl} />
            <AvatarFallback className="text-xs font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Dipendente Sconosciuto"}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(req.submittedAt).toLocaleDateString('it-IT')}</p>
          </div>
          <div className="flex items-center gap-6 text-xs font-black uppercase">
            <span className="text-green-700 bg-green-50 px-2 py-1 rounded">IN: {req.entra.name} ({req.entra.pieces})</span>
            <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded">OUT: {req.esce.name} ({req.esce.pieces})</span>
          </div>
          <Badge className={`h-6 text-[10px] font-black uppercase tracking-tight ${isApproved ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"}`}>
            {req.status === 'APPROVED' ? 'Approvata' : 'Rifiutata'}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="text-sm font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Dipendente Sconosciuto"}</h3>
              <p className="text-xs text-muted-foreground">Inviato alle {new Date(req.submittedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 px-4 text-destructive border-destructive/20 hover:bg-destructive/5 font-black text-xs" onClick={() => onUpdate(req, "REJECTED")}>RIFIUTA</Button>
            <Button size="sm" className="h-9 px-6 bg-green-600 hover:bg-green-700 font-black text-xs shadow-sm" onClick={() => onUpdate(req, "APPROVED")}>APPROVA</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4 bg-green-50/20">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <ArrowDownLeft className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">ENTRA</span>
            </div>
            <p className="text-sm font-black text-[#1e293b] truncate mb-1">{req.entra.name}</p>
            <div className="flex justify-between items-center">
              <code className="text-[10px] bg-white px-1.5 py-0.5 rounded border font-mono text-muted-foreground">{req.entra.barcode}</code>
              <span className="text-sm font-black text-green-700">Qta: {req.entra.pieces}</span>
            </div>
          </div>
          <div className="p-4 bg-rose-50/20">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">ESCE</span>
            </div>
            <p className="text-sm font-black text-[#1e293b] truncate mb-1">{req.esce.name}</p>
            <div className="flex justify-between items-center">
              <code className="text-[10px] bg-white px-1.5 py-0.5 rounded border font-mono text-muted-foreground">{req.esce.barcode}</code>
              <span className="text-sm font-black text-rose-700">Qta: {req.esce.pieces}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
