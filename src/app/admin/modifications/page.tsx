
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
          <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-[#227FD8]" /> Gestione Modifiche
          </h1>
          <p className="text-[11px] text-muted-foreground">Approvazione movimentazioni.</p>
        </div>
        <Badge variant="outline" className="h-6 gap-1 bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-bold">
          <Calendar className="h-3 w-3" /> Auto-pulizia: 7gg
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 border h-9 p-0.5 mb-4">
          <TabsTrigger value="pending" className="text-[10px] font-black uppercase px-4 h-8 data-[state=active]:bg-[#227FD8] data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5 mr-1" /> Pendenti ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] font-black uppercase px-4 h-8 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
            <History className="h-3.5 w-3.5 mr-1" /> Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#227FD8]" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <ModificationCard key={req.id} req={req} emp={employeeMap[req.employeeId]} onUpdate={handleUpdateStatus} isPending={true} />
            ))
          ) : (
            <div className="py-12 text-center text-[11px] font-bold text-muted-foreground">Tutto gestito!</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
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
        <div className="flex items-center p-2.5 gap-3">
          <div className={`w-1 h-6 rounded-full ${isApproved ? "bg-green-500" : "bg-rose-500"}`} />
          <Avatar className="h-6 w-6 border">
            <AvatarImage src={emp?.photoUrl} />
            <AvatarFallback className="text-[9px]">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</p>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-black uppercase">
            <span className="text-green-600">IN: {req.entra.name} ({req.entra.pieces})</span>
            <span className="text-rose-600">OUT: {req.esce.name} ({req.esce.pieces})</span>
          </div>
          <Badge className={`h-4 text-[8px] font-black ${isApproved ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
            {req.status}
          </Badge>
        </div>
      </Card>
    );
  }
  return (
    <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-2.5 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 border">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="text-[10px]">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-xs">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</h3>
              <p className="text-[9px] text-muted-foreground">{new Date(req.submittedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive font-black text-[10px]" onClick={() => onUpdate(req, "REJECTED")}>RIFIUTA</Button>
            <Button size="sm" className="h-7 px-3 bg-green-600 hover:bg-green-700 font-black text-[10px]" onClick={() => onUpdate(req, "APPROVED")}>APPROVA</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-2.5">
            <div className="flex items-center gap-1 text-green-600 mb-1"><ArrowDownLeft className="h-3 w-3" /><span className="text-[9px] font-black uppercase">ENTRA</span></div>
            <p className="text-[11px] font-bold truncate">{req.entra.name}</p>
            <div className="flex justify-between items-center mt-1"><span className="text-[8px] text-muted-foreground font-mono">{req.entra.barcode}</span><span className="text-[9px] font-black text-green-700">Qta: {req.entra.pieces}</span></div>
          </div>
          <div className="p-2.5">
            <div className="flex items-center gap-1 text-rose-600 mb-1"><ArrowUpRight className="h-3 w-3" /><span className="text-[9px] font-black uppercase">ESCE</span></div>
            <p className="text-[11px] font-bold truncate">{req.esce.name}</p>
            <div className="flex justify-between items-center mt-1"><span className="text-[8px] text-muted-foreground font-mono">{req.esce.barcode}</span><span className="text-[9px] font-black text-rose-700">Qta: {req.esce.pieces}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}
