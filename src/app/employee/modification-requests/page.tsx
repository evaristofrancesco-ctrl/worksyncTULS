
"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  ClipboardList, 
  Send, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Barcode, 
  Package, 
  Hash, 
  Loader2,
  Inbox,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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

  // Filtriamo per mostrare solo le richieste PENDING (quelle approvate/rifiutate spariscono)
  const pendingRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(req => req.status === "PENDING");
  }, [allRequests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !db) return

    if (!form.entra.barcode || !form.entra.name || !form.entra.pieces ||
        !form.esce.barcode || !form.esce.name || !form.esce.pieces) {
      toast({
        variant: "destructive",
        title: "Campi Mancanti",
        description: "Compila tutti i campi per entrambe le sezioni ENTRA ed ESCE."
      })
      return
    }

    setIsSubmitting(true)
    const requestId = `mod-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "modifications", requestId)

    const requestData = {
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
    }

    setDocumentNonBlocking(requestRef, requestData, { merge: true })

    setForm({
      entra: { barcode: "", name: "", pieces: "" },
      esce: { barcode: "", name: "", pieces: "" }
    })
    
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Richiesta Inviata",
        description: "La tua richiesta è in attesa di approvazione."
      })
    }, 500)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-[#227FD8]" />
          Richiesta Modifica
        </h1>
        <p className="text-muted-foreground">Invia una richiesta di movimentazione. Una volta approvata dall'admin, sparirà da questo elenco.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-black">Nuova Richiesta</CardTitle>
            <CardDescription>Inserisci i dettagli per la movimentazione pezzi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <ArrowDownLeft className="h-5 w-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">Sezione ENTRA</h3>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Codice a Barre</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Codice..." 
                        className="pl-10"
                        value={form.entra.barcode}
                        onChange={(e) => setForm({...form, entra: {...form.entra, barcode: e.target.value}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nome Articolo</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Nome..." 
                        className="pl-10"
                        value={form.entra.name}
                        onChange={(e) => setForm({...form, entra: {...form.entra, name: e.target.value}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Pezzi</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="Qta" 
                        className="pl-10"
                        value={form.entra.pieces}
                        onChange={(e) => setForm({...form, entra: {...form.entra, pieces: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <ArrowUpRight className="h-5 w-5" />
                  <h3 className="font-black uppercase tracking-widest text-sm">Sezione ESCE</h3>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Codice a Barre</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Codice..." 
                        className="pl-10"
                        value={form.esce.barcode}
                        onChange={(e) => setForm({...form, esce: {...form.esce, barcode: e.target.value}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nome Articolo</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Nome..." 
                        className="pl-10"
                        value={form.esce.name}
                        onChange={(e) => setForm({...form, esce: {...form.esce, name: e.target.value}})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Pezzi</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        placeholder="Qta" 
                        className="pl-10"
                        value={form.esce.pieces}
                        onChange={(e) => setForm({...form, esce: {...form.esce, pieces: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#227FD8] hover:bg-[#227FD8]/90 font-black shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
                INVIA RICHIESTA
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#1e293b]">Richieste in Sospeso</h2>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {pendingRequests.length} Da Gestire
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : pendingRequests.length > 0 ? (
            pendingRequests.map((req) => (
              <Card key={req.id} className="border-none shadow-sm bg-white overflow-hidden animate-in slide-in-from-right duration-300">
                <CardContent className="p-0">
                  <div className="p-4 border-b flex justify-between items-center bg-amber-50/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700">
                        {new Date(req.submittedAt).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black text-[10px] uppercase">
                      In Attesa
                    </Badge>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-green-600 text-[10px] font-black uppercase">
                        <ArrowDownLeft className="h-3 w-3" /> Entra
                      </div>
                      <p className="text-sm font-bold truncate">{req.entra.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{req.entra.barcode}</p>
                      <p className="text-xs font-black">Qta: {req.entra.pieces}</p>
                    </div>
                    <div className="space-y-1 border-l pl-4">
                      <div className="flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase">
                        <ArrowUpRight className="h-3 w-3" /> Esce
                      </div>
                      <p className="text-sm font-bold truncate">{req.esce.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{req.esce.barcode}</p>
                      <p className="text-xs font-black">Qta: {req.esce.pieces}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed text-muted-foreground gap-4">
              <Inbox className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="font-bold text-[#1e293b]">Tutto gestito!</p>
                <p className="text-xs">Non hai richieste di modifica in attesa.</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
             <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
             <p className="text-[11px] text-blue-800 leading-tight">
               <b>Nota:</b> Le richieste scompaiono da questa lista non appena l'amministratore le approva o le rifiuta. Le modifiche approvate vengono registrate permanentemente nel sistema log.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
