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
  MapPin,
  ArrowRight,
  Zap,
  LayoutGrid,
  History,
  ArrowLeftRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, limit } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function ModificationRequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("paired")
  const [mounted, setMounted] = useState(false)

  const [form, setForm] = useState({
    locationId: "",
    entra: { barcode: "", name: "", pieces: "" },
    esce: { barcode: "", name: "", pieces: "" }
  })

  useEffect(() => {
    setMounted(true)
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
      orderBy("submittedAt", "desc"),
      limit(100)
    );
  }, [db, employeeId])

  const { data: allRequests, isLoading } = useCollection(modificationsQuery)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !db) return

    const hasEntra = (activeTab === "paired" || activeTab === "entra") && form.entra.barcode && form.entra.name && form.entra.pieces;
    const hasEsce = (activeTab === "paired" || activeTab === "esce") && form.esce.barcode && form.esce.name && form.esce.pieces;

    if (!form.locationId) {
      toast({ variant: "destructive", title: "Sede mancante", description: "Seleziona la sede di riferimento." })
      return
    }

    if (activeTab === "paired" && (!hasEntra || !hasEsce)) {
      toast({ variant: "destructive", title: "Campi Mancanti", description: "In questa modalità è necessario compilare sia Entra che Esce." })
      return
    }

    if (!hasEntra && !hasEsce) {
      toast({ variant: "destructive", title: "Richiesta vuota", description: "Compila i campi richiesti per inviare la movimentazione." })
      return
    }

    setIsSubmitting(true)
    const requestId = `mod-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "modifications", requestId)
    const selectedLocation = locations?.find(l => l.id === form.locationId);

    setDocumentNonBlocking(requestRef, {
      id: requestId,
      employeeId,
      submittedAt: new Date().toISOString(),
      status: "PENDING",
      locationId: form.locationId,
      locationName: selectedLocation?.name || "Nessuna",
      type: activeTab.toUpperCase(),
      entra: hasEntra ? {
        barcode: (form.entra.barcode || "").trim(),
        name: (form.entra.name || "").trim(),
        pieces: Number(form.entra.pieces)
      } : null,
      esce: hasEsce ? {
        barcode: (form.esce.barcode || "").trim(),
        name: (form.esce.name || "").trim(),
        pieces: Number(form.esce.pieces)
      } : null
    }, { merge: true })

    const notifId = `notif-mod-${Date.now()}`;
    setDocumentNonBlocking(doc(db, "notifications", notifId), {
      id: notifId,
      recipientId: "ADMIN",
      title: "Nuova Movimentazione",
      message: `${displayName} ha inviato un movimento ${activeTab.toUpperCase()} per ${selectedLocation?.name || 'Sede N.D.'}.`,
      type: "MODIFICATION_REQUEST",
      createdAt: new Date().toISOString(),
      isRead: false
    }, { merge: true });

    setForm({
      locationId: form.locationId, // Keep location for multiple entries
      entra: { barcode: "", name: "", pieces: "" },
      esce: { barcode: "", name: "", pieces: "" }
    })
    
    setTimeout(() => {
      setIsSubmitting(false)
      toast({ title: "Inviata Correttamente", description: "La richiesta è ora in attesa di approvazione." })
    }, 500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Movimentazioni Articoli
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Entra / Esce</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="h-3 w-3" /> 
            Gestisci i carichi e gli scarichi della tua sede
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-1 account-dot bg-amber-400 rounded-full animate-pulse" />
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Stato Invii</p>
            <p className="text-xs font-bold text-[#1e293b]">{(allRequests?.filter(r => r.status === 'PENDING').length || 0)} in attesa</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* --- FORM COLUMN --- */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100">
            <div className="bg-[#1e293b] p-6 pb-8 text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ArrowLeftRight className="h-24 w-24" />
              </div>
              <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-3">Modulo Invio</Badge>
              <h2 className="text-2xl font-black tracking-tight italic">Registra Movimento</h2>
              <p className="text-slate-400 text-xs font-medium mt-1">Seleziona la tipologia e compila i campi obbligatori.</p>
            </div>
            
            <CardContent className="p-0">
              <form onSubmit={handleSubmit}>
                <div className="p-6 bg-slate-50 border-b border-slate-100">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Sede di Riferimento *</Label>
                  <Select value={form.locationId} onValueChange={(v) => setForm({...form, locationId: v})}>
                    <SelectTrigger className="h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-[#1e293b] focus:ring-[#227FD8]">
                      <SelectValue placeholder="Seleziona la sede operativa..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold">{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-16 bg-white p-1 rounded-none border-b border-slate-100">
                    <TabsTrigger value="paired" className="font-black text-[9px] uppercase tracking-tighter gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-[#227FD8]">
                      <ArrowLeftRight className="h-4 w-4" /> Scambio
                    </TabsTrigger>
                    <TabsTrigger value="entra" className="font-black text-[9px] uppercase tracking-tighter gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-600">
                      <ArrowDownLeft className="h-4 w-4" /> Solo Entra
                    </TabsTrigger>
                    <TabsTrigger value="esce" className="font-black text-[9px] uppercase tracking-tighter gap-2 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600">
                      <ArrowUpRight className="h-4 w-4" /> Solo Esce
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-6 space-y-6">
                    {/* SECTOR ENTRA */}
                    {(activeTab === "paired" || activeTab === "entra") && (
                      <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center gap-2 text-green-600">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <ArrowDownLeft className="h-4 w-4" />
                          </div>
                          <span className="font-black uppercase tracking-widest text-[10px]">Cosa Entra</span>
                        </div>
                        <div className="grid gap-3 p-4 bg-green-50/30 rounded-2xl border border-green-100/50">
                          <div className="relative">
                            <Barcode className="absolute left-4 top-3.5 h-4 w-4 text-green-400" />
                            <Input 
                              placeholder="Barcode Articolo..." 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold font-mono focus:ring-green-400"
                              value={form.entra.barcode}
                              onChange={(e) => setForm({...form, entra: {...form.entra, barcode: e.target.value}})}
                            />
                          </div>
                          <div className="relative">
                            <Package className="absolute left-4 top-3.5 h-4 w-4 text-green-400" />
                            <Input 
                              placeholder="Descrizione / Nome..." 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold focus:ring-green-400"
                              value={form.entra.name}
                              onChange={(e) => setForm({...form, entra: {...form.entra, name: e.target.value}})}
                            />
                          </div>
                          <div className="relative">
                            <Hash className="absolute left-4 top-3.5 h-4 w-4 text-green-400" />
                            <Input 
                              type="number" 
                              placeholder="Pezzi / Unità" 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold focus:ring-green-400"
                              value={form.entra.pieces}
                              onChange={(e) => setForm({...form, entra: {...form.entra, pieces: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "paired" && <Separator className="bg-slate-100" />}

                    {/* SECTOR ESCE */}
                    {(activeTab === "paired" || activeTab === "esce") && (
                      <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-2 text-rose-600">
                          <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                          <span className="font-black uppercase tracking-widest text-[10px]">Cosa Esce</span>
                        </div>
                        <div className="grid gap-3 p-4 bg-rose-50/30 rounded-2xl border border-rose-100/50">
                          <div className="relative">
                            <Barcode className="absolute left-4 top-3.5 h-4 w-4 text-rose-400" />
                            <Input 
                              placeholder="Barcode Articolo..." 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold font-mono focus:ring-rose-400"
                              value={form.esce.barcode}
                              onChange={(e) => setForm({...form, esce: {...form.esce, barcode: e.target.value}})}
                            />
                          </div>
                          <div className="relative">
                            <Package className="absolute left-4 top-3.5 h-4 w-4 text-rose-400" />
                            <Input 
                              placeholder="Descrizione / Nome..." 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold focus:ring-rose-400"
                              value={form.esce.name}
                              onChange={(e) => setForm({...form, esce: {...form.esce, name: e.target.value}})}
                            />
                          </div>
                          <div className="relative">
                            <Hash className="absolute left-4 top-3.5 h-4 w-4 text-rose-400" />
                            <Input 
                              type="number" 
                              placeholder="Pezzi / Unità" 
                              className="pl-11 h-11 border-none bg-white shadow-sm rounded-xl font-bold focus:ring-rose-400"
                              value={form.esce.pieces}
                              onChange={(e) => setForm({...form, esce: {...form.esce, pieces: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Tabs>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-[#1e293b] hover:bg-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4 mr-3" /> Invia a Amministrazione</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* --- HISTORY COLUMN --- */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#1e293b] flex items-center gap-3">
              <History className="h-4 w-4 text-[#227FD8]" /> Registro Recente
            </h2>
            <Badge variant="outline" className="rounded-full border-slate-200 text-slate-400 text-[10px] font-bold px-3 py-1">ULTIMI 100 INVÌI</Badge>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="col-span-full py-24 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recupero dati...</p>
              </div>
            ) : allRequests && allRequests.length > 0 ? allRequests.map((req) => (
              <div key={req.id} className="group relative bg-white rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 hover:shadow-lg hover:ring-[#227FD8]/30 transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md",
                      req.status === 'PENDING' ? 'bg-amber-400' : req.status === 'APPROVED' ? 'bg-green-500' : 'bg-rose-500'
                    )}>
                      {req.status === 'PENDING' ? <Clock className="h-5 w-5" /> : req.status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">MOV {req.id.split('-').pop()}</p>
                      <p className="text-xs font-black text-[#1e293b]">{new Date(req.submittedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <MapPin className="h-2.5 w-2.5 mr-1" /> {req.locationName}
                    </Badge>
                    <Badge className={cn(
                      "h-6 text-[9px] font-black uppercase tracking-widest border-none px-3",
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                    )}>
                      {req.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {req.entra && (
                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/30 flex items-start gap-3">
                      <div className="mt-1"><ArrowDownLeft className="h-3.5 w-3.5 text-green-600" /></div>
                      <div>
                        <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1">ENTRATA</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{req.entra.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-md font-mono">{req.entra.barcode}</code>
                          <span className="text-xs font-black text-slate-400">x{req.entra.pieces}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {req.esce && (
                    <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/30 flex items-start gap-3">
                      <div className="mt-1"><ArrowUpRight className="h-3.5 w-3.5 text-rose-600" /></div>
                      <div>
                        <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1">USCITA</p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{req.esce.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-md font-mono">{req.esce.barcode}</code>
                          <span className="text-xs font-black text-slate-400">x{req.esce.pieces}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                   {req.status === 'PENDING' && (
                     <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest text-[#227FD8] hover:bg-blue-50" onClick={() => {
                        const ref = doc(db, "employees", employeeId || "", "modifications", req.id);
                        deleteDocumentNonBlocking(ref);
                        toast({ title: "Annullata", description: "La richiesta è stata ritirata." });
                     }}>
                       <XCircle className="h-3 w-3 mr-2" /> Annulla invio
                     </Button>
                   )}
                </div>
              </div>
            )) : (
              <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6 font-black text-slate-200 text-3xl italic">
                  ?
                </div>
                <h3 className="text-xl font-black text-[#1e293b] tracking-tight">Nessuna movimentazione</h3>
                <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">
                   Inizia inviando il tuo primo movimento tramite il modulo a sinistra.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
