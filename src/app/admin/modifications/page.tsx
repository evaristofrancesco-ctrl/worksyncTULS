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
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  User,
  History,
  ClipboardCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, collectionGroup, doc, query, limit, orderBy } from "firebase/firestore"
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
    return query(
      collectionGroup(db, "modifications"),
      limit(500)
    );
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
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Logistica & Movimentazioni
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Centro Approvazioni</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ClipboardCheck className="h-3 w-3" /> 
            Monitora e convalida i movimenti del team
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-1 account-dot bg-blue-500 rounded-full" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Totale Processate</p>
            <p className="text-xs font-bold text-[#1e293b]">{historyRequests.length} movimentazioni</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md h-12 bg-slate-100 p-1 rounded-2xl mb-8">
          <TabsTrigger value="pending" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pendenti ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Storico ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8] opacity-20" /></div>
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
            <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6">
                <Inbox className="h-10 w-10 text-slate-100" />
              </div>
              <h3 className="text-xl font-black text-[#1e293b] tracking-tight italic">Tutto in ordine!</h3>
              <p className="text-slate-400 font-medium text-sm mt-2">Non ci sono richieste in attesa di approvazione.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 animate-in fade-in duration-500">
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

      {/* --- AI DRAFT DIALOG --- */}
      <Dialog open={!!emailDraft || isDrafting} onOpenChange={() => setEmailDraft(null)}>
        <DialogContent className="max-w-2xl p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="bg-[#1e293b] p-8 text-white">
            <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-4">Assistente AI</Badge>
            <DialogTitle className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-blue-400" /> Bozza Comunicazione
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium mt-1">L'intelligenza artificiale ha elaborato un riscontro professionale.</DialogDescription>
          </div>

          <div className="p-8 space-y-6">
            {isDrafting ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-[#227FD8]" />
                <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">Generazione in corso...</p>
              </div>
            ) : emailDraft && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-sm flex items-center gap-3">
                  <Badge variant="outline" className="text-[8px] font-black uppercase text-slate-400 border-slate-200">Oggetto</Badge>
                  <span className="text-[#1e293b]">{emailDraft.subject}</span>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap min-h-[220px] max-h-[350px] overflow-y-auto font-medium text-slate-600 shadow-inner">
                  {emailDraft.body}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            <Button variant="ghost" onClick={() => setEmailDraft(null)} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex-1">Chiudi</Button>
            <Button 
              className="rounded-2xl h-14 bg-[#1e293b] hover:bg-black font-black text-[10px] uppercase tracking-[0.2em] flex-1 px-8 shadow-xl"
              onClick={() => {
                if (emailDraft) {
                  navigator.clipboard.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`);
                  toast({ title: "Copiato", description: "Bozza pronta per essere incollata." });
                }
              }}
            >
              <Copy className="h-4 w-4 mr-3" /> Copia Negli Appunti
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
  const isPaired = req.entra && req.esce;
  
  if (!isPending) {
    return (
      <div className="group relative bg-white rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isApproved ? "bg-green-500" : "bg-rose-500"
        )} />
        
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="bg-slate-100 text-[#1e293b] font-black text-xs">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-black text-[#1e293b]">{emp ? `${emp.firstName} ${emp.lastName}` : "Collaboratore"}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] font-bold text-slate-400 bg-slate-50 border-slate-100 uppercase py-0 group-hover:bg-[#227FD8]/5 group-hover:text-[#227FD8] transition-colors">
                  {req.locationName}
                </Badge>
                <span className="text-[9px] font-medium text-slate-300 italic">{fullDateTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-4 border-r border-slate-100 pr-6 mr-3">
                {req.entra && (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><ArrowDownLeft className="h-3.5 w-3.5" /></div>
                    <code className="text-[9px] font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md">{req.entra.barcode}</code>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">x{req.entra.pieces}</span>
                  </div>
                )}
                {req.esce && (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600"><ArrowUpRight className="h-3.5 w-3.5" /></div>
                    <code className="text-[9px] font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md">{req.esce.barcode}</code>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">x{req.esce.pieces}</span>
                  </div>
                )}
             </div>

             <div className="flex items-center gap-4">
                <Badge className={cn(
                  "h-7 text-[9px] font-black uppercase tracking-widest px-3 border-none",
                  isApproved ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                )}>
                  {req.status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-[#227FD8] hover:bg-blue-50 transition-colors" onClick={onDraft}>
                  <Mail className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-colors" onClick={() => onDelete(req)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-amber-200 transition-all duration-500 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-400 rounded-full blur-[80px] opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-slate-100">
              <AvatarImage src={emp?.photoUrl} />
              <AvatarFallback className="bg-[#1e293b] text-white font-black text-sm">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-black text-base text-[#1e293b] tracking-tight">{emp ? `${emp.firstName} ${emp.lastName}` : "Collaboratore"}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0">PENDENTE</Badge>
                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {fullDateTime}
                </span>
                <span className="text-[9px] font-black uppercase text-[#227FD8] ml-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {req.locationName}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-[#227FD8] rounded-xl hover:bg-blue-50" onClick={onDraft}>
              <Mail className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50" onClick={() => onDelete(req)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className={cn(
          "rounded-[1.5rem] border border-slate-100 overflow-hidden",
          isPaired ? "grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/30" : "bg-slate-50/50"
        )}>
          {req.entra && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Entrata Articoli</span>
              </div>
              <div>
                <p className="text-sm font-black text-[#1e293b] line-clamp-1">{req.entra.name}</p>
                <div className="flex items-center justify-between mt-3 bg-white/80 p-2.5 rounded-xl shadow-sm border border-white">
                  <code className="text-[10px] font-black font-mono bg-slate-900 text-white px-2 py-1 rounded-lg letter-spacing-wider">{req.entra.barcode}</code>
                  <span className="text-sm font-black text-green-600">Qta: {req.entra.pieces}</span>
                </div>
              </div>
            </div>
          )}
          {req.esce && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Uscita Articoli</span>
              </div>
              <div>
                <p className="text-sm font-black text-[#1e293b] line-clamp-1">{req.esce.name}</p>
                <div className="flex items-center justify-between mt-3 bg-white/80 p-2.5 rounded-xl shadow-sm border border-white">
                  <code className="text-[10px] font-black font-mono bg-slate-900 text-white px-2 py-1 rounded-lg letter-spacing-wider">{req.esce.barcode}</code>
                  <span className="text-sm font-black text-rose-600">Qta: {req.esce.pieces}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest border-rose-200 text-rose-600 shadow-sm hover:bg-rose-50"
            onClick={() => onUpdate(req, "REJECTED")}
          >
            RIFIUTA RICHIESTA
          </Button>
          <Button 
            className="flex-1 rounded-2xl h-12 bg-[#227FD8] hover:bg-[#227FD8]/90 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/10"
            onClick={() => onUpdate(req, "APPROVED")}
          >
            APPROVA MOVIMENTO
          </Button>
        </div>
      </div>
    </div>
  );
}
