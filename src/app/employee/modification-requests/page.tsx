
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
  XCircle,
  MapPin
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ModificationRequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    locationId: "",
    entra: { barcode: "", name: "", pieces: "" },
    esce: { barcode: "", name: "", pieces: "" }
  })

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
    setDisplayName(localStorage.getItem("userName") || "Un dipendente")
  }, [])

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !db) return

    if (!form.locationId || !form.entra.barcode || !form.entra.name || !form.entra.pieces ||
        !form.esce.barcode || !form.esce.name || !form.esce.pieces) {
      toast({
        variant: "destructive",
        title: "Campi Mancanti",
        description: "Compila tutti i campi richiesti, inclusa la sede."
      })
      return
    }

    setIsSubmitting(true)
    const requestId = `mod-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "modifications", requestId)
    const selectedLocation = locations?.find(l => l.id === form.locationId);

    // Salva la richiesta
    setDocumentNonBlocking(requestRef, {
      id: requestId,
      employeeId,
      submittedAt: new Date().toISOString(),
      status: "PENDING",
      locationId: form.locationId,
      locationName: selectedLocation?.name || "Nessuna",
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

    // Manda notifica agli ADMIN
    const notifId = `notif-mod-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: "ADMIN",
      title: "Nuova Richiesta Entra/Esce",
      message: `${displayName} (${selectedLocation?.name}) ha inviato una nuova movimentazione: ${form.entra.name} <-> ${form.esce.name}.`,
      type: "MODIFICATION_REQUEST",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });

    setForm({
      locationId: "",
      entra: { barcode: "", name: "", pieces: "" },
      esce: { barcode: "", name: "", pieces: "" }
    })
    
    setTimeout(() => {
      setIsSubmitting(false)
      toast({ title: "Inviata", description: "La tua richiesta è in attesa di revisione." })
    }, 500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8]">
          <ClipboardList className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Entra/Esce</h1>
          <p className="text-sm text-muted-foreground">Invia le movimentazioni degli articoli per l'approvazione.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-sm bg-white ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-black uppercase tracking-widest">Nuovo Invio</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Sede di Riferimento
                  </Label>
                  <Select value={form.locationId} onValueChange={(v) => setForm({...form, locationId: v})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Scegli la sede..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <ArrowDownLeft className="h-5 w-5" />
                    <span className="font-black uppercase tracking-widest text-xs">COSA ENTRA</span>
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Codice a Barre</Label>
                      <Input 
                        placeholder="Scannerizza o digita..." 
                        className="h-10 text-sm"
                        value={form.entra.barcode}
                        onChange={(e) => setForm({...form, entra: {...form.entra, barcode: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Articolo</Label>
                      <Input 
                        placeholder="Nome dell'articolo..." 
                        className="h-10 text-sm"
                        value={form.entra.name}
                        onChange={(e) => setForm({...form, entra: {...form.entra, name: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Pezzi</Label>
                      <Input 
                        type="number" 
                        placeholder="Quantità" 
                        className="h-10 text-sm"
                        value={form.entra.pieces}
                        onChange={(e) => setForm({...form, entra: {...form.entra, pieces: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <ArrowUpRight className="h-5 w-5" />
                    <span className="font-black uppercase tracking-widest text-xs">COSA ESCE</span>
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Codice a Barre</Label>
                      <Input 
                        placeholder="Scannerizza o digita..." 
                        className="h-10 text-sm"
                        value={form.esce.barcode}
                        onChange={(e) => setForm({...form, esce: {...form.esce, barcode: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Articolo</Label>
                      <Input 
                        placeholder="Nome dell'articolo..." 
                        className="h-10 text-sm"
                        value={form.esce.name}
                        onChange={(e) => setForm({...form, esce: {...form.esce, name: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Pezzi</Label>
                      <Input 
                        type="number" 
                        placeholder="Quantità" 
                        className="h-10 text-sm"
                        value={form.esce.pieces}
                        onChange={(e) => setForm({...form, esce: {...form.esce, pieces: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-[#227FD8] hover:bg-[#227FD8]/90 font-black text-sm uppercase tracking-widest shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 mr-3" />}
                  Invia Movimentazione
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 flex gap-4">
             <AlertCircle className="h-6 w-6 text-blue-600 shrink-0" />
             <p className="text-xs text-blue-800 leading-relaxed font-medium">
               I tuoi invii rimarranno visibili per <b>7 giorni</b> prima di essere rimossi automaticamente dall'archivio personale.
             </p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 px-1">I Miei Invii Recenti</h2>
          </div>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : allRequests && allRequests.length > 0 ? (
              allRequests.map((req) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                return (
                  <Card key={req.id} className={`border-none shadow-sm transition-all overflow-hidden ${isPending ? 'ring-2 ring-amber-100' : 'opacity-90 bg-white/50'}`}>
                    <div className={`px-4 py-2 flex justify-between items-center text-[11px] font-bold ${isPending ? 'bg-amber-50' : isApproved ? 'bg-green-50' : 'bg-rose-50'}`}>
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" /> {new Date(req.submittedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-2 opacity-20">|</span>
                        <MapPin className="h-3 w-3" /> {req.locationName || "Sede N.D."}
                      </span>
                      <Badge className={`h-5 text-[9px] border-none px-2 font-black uppercase tracking-widest ${
                        isPending ? 'bg-amber-200 text-amber-900' : 
                        isApproved ? 'bg-green-600 text-white' : 
                        'bg-rose-600 text-white'
                      }`}>
                        {isPending ? 'IN ATTESA' : isApproved ? 'APPROVATA' : 'RIFIUTATA'}
                      </Badge>
                    </div>
                    <div className="p-4 grid grid-cols-2 divide-x border-t">
                      <div className="pr-4">
                        <p className="text-[10px] font-black uppercase text-green-600 mb-1">Entra</p>
                        <p className="text-sm font-bold text-[#1e293b] truncate mb-1">{req.entra.name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-muted-foreground">{req.entra.barcode}</code>
                          <span className="text-xs font-black">x{req.entra.pieces}</span>
                        </div>
                      </div>
                      <div className="pl-4">
                        <p className="text-[10px] font-black uppercase text-rose-600 mb-1">Esce</p>
                        <p className="text-sm font-bold text-[#1e293b] truncate mb-1">{req.esce.name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-muted-foreground">{req.esce.barcode}</code>
                          <span className="text-xs font-black">x{req.esce.pieces}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-muted/20 rounded-3xl border border-dashed opacity-40">
                <Inbox className="h-12 w-12 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessuna movimentazione inviata</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
