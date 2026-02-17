
"use client"

import { useState, useEffect } from "react"
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
  Inbox
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

  const { data: requests, isLoading } = useCollection(modificationsQuery)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !db) return

    // Validazione base
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

    // Reset form
    setForm({
      entra: { barcode: "", name: "", pieces: "" },
      esce: { barcode: "", name: "", pieces: "" }
    })
    
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Richiesta Inviata",
        description: "La tua richiesta di modifica è stata inoltrata correttamente."
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
        <p className="text-muted-foreground">Invia una richiesta di movimentazione pezzi tra ENTRA ed ESCE.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form Sezione */}
        <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-black">Nuova Richiesta</CardTitle>
            <CardDescription>Compila i dettagli degli articoli da movimentare.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SEZIONE ENTRA */}
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
                        placeholder="Scannerizza o inserisci codice..." 
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
                        placeholder="es. T-Shirt Bianca L" 
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
                        placeholder="Quantità" 
                        className="pl-10"
                        value={form.entra.pieces}
                        onChange={(e) => setForm({...form, entra: {...form.entra, pieces: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* SEZIONE ESCE */}
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
                        placeholder="Scannerizza o inserisci codice..." 
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
                        placeholder="es. Felpa Blu M" 
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
                        placeholder="Quantità" 
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
                INVIA RICHIESTA MODIFICA
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista Storico */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#1e293b]">Ultime Richieste Inviate</h2>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : requests && requests.length > 0 ? (
            requests.map((req) => (
              <Card key={req.id} className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <span className="text-xs font-bold text-muted-foreground">
                      {new Date(req.submittedAt).toLocaleString('it-IT')}
                    </span>
                    <Badge variant="outline" className="font-black text-[10px]">
                      {req.status}
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
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
              <Inbox className="h-12 w-12 opacity-20" />
              <p className="italic font-medium">Nessuna richiesta inviata finora.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
