
"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  ClipboardList, 
  Send, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Barcode, 
  Package, 
  Hash, 
  Loader2,
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

export default function ModificationRequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    entra: { barcode: "", name: "", pieces: "" },
    esce: { barcode: "", name: "", pieces: "" }
  })

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const modificationsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "modifications"),
      orderBy("submittedAt", "desc")
    );
  }, [db, employeeId])

  const { data: allRequests, isLoading } = useCollection(modificationsQuery)

  useEffect(() => {
    if (!allRequests || !db || !employeeId) return;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    allRequests.forEach(req => {
      const submittedAt = new Date(req.submittedAt);
      if (submittedAt < oneWeekAgo) {
        const ref = doc(db, "employees", employeeId, "modifications", req.id);
        deleteDocumentNonBlocking(ref);
      }
    });
  }, [allRequests, db, employeeId]);

  const pendingRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(r => r.status === "PENDING");
  }, [allRequests]);

  const managedRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(r => r.status !== "PENDING");
  }, [allRequests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !db) return

    if (!form.entra.barcode || !form.entra.name || !form.entra.pieces ||
        !form.esce.barcode || !form.esce.name || !form.esce.pieces) {
      toast({
        variant: "destructive",
        title: "Campi Mancanti",
        description: "Compila tutti i campi richiesti."
      })
      return
    }

    setIsSubmitting(true)
    const requestId = `mod-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "modifications", requestId)

    setDocumentNonBlocking(requestRef, {
      id: requestId,
      employeeId,
      submittedAt: new Date().toISOString(),
      status: "PENDING",
      entra: {
        barcode: form.entra.barcode,
        name: form.entra.name,
        pieces: Number(form.entra.pieces)
      },
      esce: {
        barcode: form.esce.barcode,
        name: form.esce.name,
        pieces: Number(form.esce.pieces)
      }
    }, { merge: true })

    setForm({
      entra: { barcode: "", name: "", pieces: "" },
      esce: { barcode: "", name: "", pieces: "" }
    })
    
    setTimeout(() => {
      setIsSubmitting(false)
      toast({ title: "Inviata", description: "La tua richiesta è ora in attesa." })
    }, 500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-[#227FD8]" />
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">Richiesta Modifica</h1>
          <p className="text-xs text-muted-foreground">Invia e monitora le movimentazioni IN/OUT degli articoli.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-none shadow-sm bg-white/80 ring-1 ring-slate-200">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-black uppercase">Nuovo Invio</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <ArrowDownLeft className="h-4 w-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">ENTRA</span>
                  </div>
                  <div className="grid gap-2">
                    <Input 
                      placeholder="Codice a barre..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.entra.barcode}
                      onChange={(e) => setForm({...form, entra: {...form.entra, barcode: e.target.value}})}
                    />
                    <Input 
                      placeholder="Nome articolo..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.entra.name}
                      onChange={(e) => setForm({...form, entra: {...form.entra, name: e.target.value}})}
                    />
                    <Input 
                      type="number" 
                      placeholder="Pezzi" 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.entra.pieces}
                      onChange={(e) => setForm({...form, entra: {...form.entra, pieces: e.target.value}})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-600">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">ESCE</span>
                  </div>
                  <div className="grid gap-2">
                    <Input 
                      placeholder="Codice a barre..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.esce.barcode}
                      onChange={(e) => setForm({...form, esce: {...form.esce, barcode: e.target.value}})}
                    />
                    <Input 
                      placeholder="Nome articolo..." 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.esce.name}
                      onChange={(e) => setForm({...form, esce: {...form.esce, name: e.target.value}})}
                    />
                    <Input 
                      type="number" 
                      placeholder="Pezzi" 
                      className="h-8 text-xs bg-slate-50 border-slate-200"
                      value={form.esce.pieces}
                      onChange={(e) => setForm({...form, esce: {...form.esce, pieces: e.target.value}})}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-10 bg-[#227FD8] hover:bg-[#227FD8]/90 font-black text-xs uppercase"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                  Invia Modifica
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex gap-2.5">
             <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
             <p className="text-[10px] text-blue-800 leading-normal">
               Le tue richieste rimarranno visibili per <b>7 giorni</b> prima di essere rimosse dall'archivio.
             </p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Le Mie Attività</h2>
          </div>
          
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : allRequests && allRequests.length > 0 ? (
              allRequests.map((req) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                return (
                  <Card key={req.id} className={`border-none shadow-sm transition-all overflow-hidden ${isPending ? 'ring-1 ring-amber-200' : 'opacity-80 bg-slate-50'}`}>
                    <div className={`px-3 py-1.5 flex justify-between items-center text-[9px] font-bold ${isPending ? 'bg-amber-50' : isApproved ? 'bg-green-50' : 'bg-rose-50'}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(req.submittedAt).toLocaleString('it-IT')}
                      </span>
                      <Badge className={`h-4 text-[8px] border-none px-1.5 font-black uppercase tracking-tighter ${
                        isPending ? 'bg-amber-200 text-amber-800' : 
                        isApproved ? 'bg-green-600 text-white' : 
                        'bg-rose-600 text-white'
                      }`}>
                        {isPending ? 'ATTESA APPROVAZIONE' : isApproved ? 'GESTITA' : 'RIFIUTATA'}
                      </Badge>
                    </div>
                    <div className="p-3 grid grid-cols-2 divide-x">
                      <div className="pr-3">
                        <p className="text-[8px] font-black uppercase text-green-600 mb-0.5">Entra</p>
                        <p className="text-xs font-bold truncate leading-none mb-1">{req.entra.name}</p>
                        <div className="flex justify-between items-end">
                          <code className="text-[8px] text-muted-foreground">{req.entra.barcode}</code>
                          <span className="text-[9px] font-black">Qta: {req.entra.pieces}</span>
                        </div>
                      </div>
                      <div className="pl-3">
                        <p className="text-[8px] font-black uppercase text-rose-600 mb-0.5">Esce</p>
                        <p className="text-xs font-bold truncate leading-none mb-1">{req.esce.name}</p>
                        <div className="flex justify-between items-end">
                          <code className="text-[8px] text-muted-foreground">{req.esce.barcode}</code>
                          <span className="text-[9px] font-black">Qta: {req.esce.pieces}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border border-dashed opacity-50">
                <Inbox className="h-10 w-10 mb-2" />
                <p className="text-[10px] font-bold">Nessuna richiesta inviata</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
