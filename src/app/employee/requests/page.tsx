
"use client"

import { Plus, Clock, CheckCircle2, XCircle, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"

export default function MyRequestsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newRequest, setNewRequest] = useState({
    type: "VACATION",
    startDate: "",
    endDate: "",
    reason: ""
  })

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "requests"),
      orderBy("submittedAt", "desc")
    );
  }, [db, employeeId])
  
  const { data: requests, isLoading } = useCollection(requestsQuery)

  const handleSubmitRequest = () => {
    if (!employeeId || !db || !newRequest.startDate) {
      toast({ variant: "destructive", title: "Errore", description: "La data di inizio è obbligatoria." })
      return;
    }

    const requestId = `req-${Date.now()}`
    const requestRef = doc(db, "employees", employeeId, "requests", requestId)
    
    setDocumentNonBlocking(requestRef, {
      id: requestId,
      employeeId: employeeId,
      ...newRequest,
      status: "In Attesa",
      submittedAt: new Date().toISOString()
    }, { merge: true })

    setIsDialogOpen(false)
    setNewRequest({ type: "VACATION", startDate: "", endDate: "", reason: "" })
    toast({ title: "Richiesta Inviata", description: "La tua richiesta è stata inoltrata all'amministrazione." })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Le Mie Richieste</h1>
          <p className="text-muted-foreground">Gestisci le tue richieste di ferie e permessi.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] font-bold shadow-md">
              <Plus className="h-4 w-4" /> Nuova Richiesta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-black">Invia Nuova Richiesta</DialogTitle>
              <DialogDescription>
                Compila il modulo per richiedere ferie o permessi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold">Tipo di Richiesta</Label>
                <Select value={newRequest.type} onValueChange={(v) => setNewRequest({...newRequest, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Ferie</SelectItem>
                    <SelectItem value="SICK">Malattia</SelectItem>
                    <SelectItem value="PERSONAL">Permesso Personale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Data Inizio</Label>
                  <Input type="date" value={newRequest.startDate} onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Data Fine</Label>
                  <Input type="date" value={newRequest.endDate} onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Motivazione (opzionale)</Label>
                <Textarea placeholder="Breve descrizione..." value={newRequest.reason} onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleSubmitRequest} className="bg-[#227FD8] font-black">Invia Richiesta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requests && requests.length > 0 ? (
          requests.map((req) => (
            <Card key={req.id} className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${req.status === 'Approvato' ? 'bg-green-100 text-green-600' : req.status === 'Rifiutato' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-600'}`}>
                      {req.status === 'Approvato' ? <CheckCircle2 className="h-5 w-5" /> : req.status === 'Rifiutato' ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1e293b]">{req.type === 'VACATION' ? 'Ferie' : req.type === 'SICK' ? 'Malattia' : 'Permesso'}</h3>
                      <p className="text-sm text-muted-foreground">{req.startDate} {req.endDate ? `al ${req.endDate}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant={req.status === 'Approvato' ? 'default' : 'secondary'}
                      className={req.status === 'Approvato' ? 'bg-green-500' : req.status === 'Rifiutato' ? 'bg-destructive text-white' : ''}
                    >
                      {req.status}
                    </Badge>
                  </div>
                </div>
                {req.reason && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-[10px] text-muted-foreground mb-1 font-black uppercase">Motivazione:</p>
                    <p className="text-sm italic text-slate-600">"{req.reason}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center py-20 text-muted-foreground italic">Nessuna richiesta inviata.</p>
        )}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <Info className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Ricorda che le richieste devono essere approvate dall'amministrazione per essere effettive.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
