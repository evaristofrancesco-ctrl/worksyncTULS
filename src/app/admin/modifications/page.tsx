"use client"

import { useState, useMemo } from "react"
import { 
  ArrowLeftRight, 
  Loader2, 
  Inbox, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  MapPin,
  Barcode,
  Trash2,
  Mail,
  Copy,
  Sparkles,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, doc, query, limit } from "firebase/firestore"
import { updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { draftEmail } from "@/ai/flows/draft-email-flow"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

export default function AdminModificationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isDrafting, setIsDrafting] = useState(false)
  const [emailDraft, setEmailDraft] = useState<{subject: string, body: string} | null>(null)

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  const modificationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "modifications"), limit(500));
  }, [db])
  const { data: rawModifications, isLoading } = useCollection(modificationsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  const sortedModifications = useMemo(() => {
    if (!rawModifications) return [];
    return [...rawModifications].sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [rawModifications]);

  const pendingRequests = useMemo(() => sortedModifications.filter(m => m.status === "PENDING"), [sortedModifications]);
  const historyRequests = useMemo(() => sortedModifications.filter(m => m.status !== "PENDING"), [sortedModifications]);

  const handleUpdateStatus = (request: any, newStatus: string) => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "modifications", request.id);
    
    updateDocumentNonBlocking(requestRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    // Invia notifica di esito al dipendente
    const notifId = `notif-mod-res-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: request.employeeId,
      title: "Esito Entra/Esce",
      message: `La tua richiesta di movimentazione è stata ${newStatus === 'APPROVED' ? 'approvata' : 'rifiutata'} dall'amministrazione.`,
      type: "MODIFICATION_STATUS",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });

    toast({ title: newStatus === "APPROVED" ? "Approvata" : "Rifiutata" })
  }

  const handleDraftEmail = async (request: any) => {
    setIsDrafting(true);
    const emp = employeeMap[request.employeeId];
    try {
      const draft = await draftEmail({
        recipientName: emp?.firstName || "Collaboratore",
        eventType: `Movimentazione ${request.locationName} - Stato: ${request.status}`,
        details: `Entra: ${request.entra?.name || 'nessuno'}, Esce: ${request.esce?.name || 'nessuno'}. Esito amministrativo: ${request.status === 'APPROVED' ? 'Approvato' : 'Non approvato'}.`,
        adminName: user?.displayName || "Amministratore"
      });
      setEmailDraft(draft);
    } catch (e) {
      toast({ variant: "destructive", title: "Errore AI", description: "Impossibile generare la bozza." });
    } finally {
      setIsDrafting(false);
    }
  }

  const handleDeleteRequest = (request: any) => {
    if (!db) return;
    const requestRef = doc(db, "employees", request.employeeId, "modifications", request.id);
    deleteDocumentNonBlocking(requestRef);
    toast({ title: "Richiesta eliminata", description: "Il record è stato rimosso dal sistema." });
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
            pendingRequests.map((req) => (
              <ModificationCard 
                key={req.id} 
                req={req} 
                emp={employeeMap[req.employeeId]} 
                onUpdate={handleUpdateStatus} 
                onDelete={handleDeleteRequest}
                onDraft={() => handleDraftEmail(req)}
                isPending={true} 
              />
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
            <ModificationCard 
              key={req.id} 
              req={req} 
              emp={employeeMap[req.employeeId]} 
              onUpdate={handleUpdateStatus} 
              onDelete={handleDeleteRequest}
              onDraft={() => handleDraftEmail(req)}
              isPending={false} 
            />
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!emailDraft || isDrafting} onOpenChange={() => setEmailDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-[#227FD8] flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Bozza Email AI
            </DialogTitle>
            <DialogDescription>Generazione bozza per comunicazione movimentazione.</DialogDescription>
          </DialogHeader>
          {isDrafting ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
              <p className="font-bold text-slate-400">L'AI sta preparando il contenuto...</p>
            </div>
          ) : emailDraft && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg border font-bold text-sm">
                <span className="text-slate-400 uppercase text-[10px] mr-2">Oggetto:</span> {emailDraft.subject}
              </div>
              <div className="p-4 bg-white rounded-lg border text-sm leading-relaxed whitespace-pre-wrap min-h-[200px] max-h-[400px] overflow-y-auto font-medium text-slate-700">
                {emailDraft.body}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEmailDraft(null)} className="font-bold">Chiudi</Button>
            <Button 
              className="bg-[#227FD8] gap-2 font-black"
              onClick={() => {
                if (emailDraft) {
                  navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                  toast({ title: "Copiato", description: "Bozza copiata negli appunti." });
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copia Tutto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModificationCard({ req, emp, onUpdate, onDelete, onDraft, isPending }: { req: any, emp: any, onUpdate: any, onDelete: any, onDraft: any, isPending: boolean }) {
  const isApproved = req.status === "APPROVED";
  const fullDateTime = req.submittedAt ? new Date(req.submittedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';
  
  if (!isPending) {
    return (
      <Card className="border-none shadow-sm bg-white/60 hover:bg-white transition-all overflow-hidden border-l-4" style={{ borderLeftColor: isApproved ? '#22c55e' : '#ef4444' }}>
        <div className="flex items-center p-4 gap-4">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={emp?.photoUrl} />
            <AvatarFallback className="text-xs font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Dipendente Sconosciuto"}</p>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-black uppercase">
              <span className="flex items-center gap-1"><Clock className="h-2 w-2" /> {fullDateTime}</span>
              <span className="opacity-20">|</span>
              <MapPin className="h-2.5 w-2.5" />
              <span>{req.locationName || "Sede N.D."}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase">
            {req.entra && (
              <div className="flex flex-col items-end">
                <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded mb-0.5">IN: {req.entra.name} ({req.entra.pieces})</span>
                <code className="text-[9px] font-mono font-black bg-slate-900 text-white px-1.5 rounded">{req.entra.barcode}</code>
              </div>
            )}
            {req.esce && (
              <div className={cn("flex flex-col items-end", req.entra && "border-l pl-4")}>
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded mb-0.5">OUT: {req.esce.name} (-{req.esce.pieces})</span>
                <code className="text-[9px] font-mono font-black bg-slate-900 text-white px-1.5 rounded">{req.esce.barcode}</code>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#227FD8]" onClick={onDraft}>
              <Mail className="h-4 w-4" />
            </Button>
            <Badge className={`h-6 text-[10px] font-black uppercase tracking-tight ${isApproved ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"}`}>
              {req.status === 'APPROVED' ? 'Approvata' : 'Rifiutata'}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => onDelete(req)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200 overflow-hidden border-l-4 border-l-amber-400">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="text-sm font-bold">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Dipendente Sconosciuto"}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1 font-bold text-[10px] text-[#227FD8] uppercase">
                  <Clock className="h-3 w-3" /> Inviato il {fullDateTime}
                </span>
                <span className="opacity-20">|</span>
                <MapPin className="h-3 w-3 text-[#227FD8]" />
                <span className="font-black uppercase tracking-widest text-[10px]">{req.locationName || "Sede N.D."}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-[#227FD8] hover:bg-blue-50" onClick={onDraft}>
              <Mail className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-destructive mr-2" onClick={() => onDelete(req)}>
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-4 text-destructive border-destructive/20 hover:bg-destructive/5 font-black text-xs" onClick={() => onUpdate(req, "REJECTED")}>RIFIUTA</Button>
            <Button size="sm" className="h-9 px-6 bg-green-600 hover:bg-green-700 font-black text-xs shadow-sm" onClick={() => onUpdate(req, "APPROVED")}>APPROVA</Button>
          </div>
        </div>
        <div className={cn("grid divide-y md:divide-y-0 md:divide-x", req.entra && req.esce ? "grid-cols-2" : "grid-cols-1")}>
          {req.entra && (
            <div className="p-4 bg-green-50/20">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">ENTRA</span>
              </div>
              <p className="text-sm font-black text-[#1e293b] truncate mb-2">{req.entra.name}</p>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-slate-400" />
                  <code className="text-sm font-black font-mono text-white bg-slate-900 px-2 py-0.5 rounded tracking-wider">{req.entra.barcode}</code>
                </div>
                <span className="text-sm font-black text-green-700">Qta: {req.entra.pieces}</span>
              </div>
            </div>
          )}
          {req.esce && (
            <div className="p-4 bg-rose-50/20">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">ESCE</span>
              </div>
              <p className="text-sm font-black text-[#1e293b] truncate mb-2">{req.esce.name}</p>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-slate-400" />
                  <code className="text-sm font-black font-mono text-white bg-slate-900 px-2 py-0.5 rounded tracking-wider">{req.esce.barcode}</code>
                </div>
                <span className="text-sm font-black text-rose-700">Qta: -{req.esce.pieces}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
