
"use client"

import { Plus, Clock, CheckCircle2, XCircle, Info, Loader2, MessageSquareText } from "lucide-react"
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
import { useState, useEffect } from "react"
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
            <Button className="gap-2 bg-[#227FD8] font-bold shadow-md h-11 px-6">
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
                <Label className="font-bold">Motivazione (tua nota)</Label>
                <Textarea placeholder="Breve descrizione per l'amministrazione..." value={newRequest.reason} onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleSubmitRequest} className="bg-[#227FD8] font-black h-11 px-8">INVIA RICHIESTA</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requests && requests.length > 0 ? (
          requests.map((req) => {
            const isApproved = req.status === 'Approvato';
            const isRejected = req.status === 'Rifiutato';
            
            return (
              <Card key={req.id} className={`border-none shadow-sm transition-all ${isRejected ? 'bg-destructive/5' : 'bg-white/80'} backdrop-blur-sm`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isApproved ? 'bg-green-100 text-green-600' : isRejected ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-600'}`}>
                        {isApproved ? <CheckCircle2 className="h-6 w-6" /> : isRejected ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="font-black text-[#1e293b] text-lg uppercase tracking-tight">
                          {req.type === 'VACATION' ? 'Ferie' : req.type === 'SICK' ? 'Malattia' : 'Permesso'}
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground">{req.startDate} {req.endDate ? `al ${req.endDate}` : ""}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={isApproved ? 'default' : 'secondary'}
                      className={`${isApproved ? 'bg-green-500 hover:bg-green-600' : isRejected ? 'bg-destructive text-white' : 'bg-amber-100 text-amber-700'} font-black px-4 py-1`}
                    >
                      {req.status}
                    </Badge>
                  </div>
                  
                  {req.reason && (
                    <div className="mt-4 pt-4 border-t border-muted/50">
                      <p className="text-[10px] text-muted-foreground mb-1 font-black uppercase tracking-widest">La tua motivazione:</p>
                      <p className="text-sm italic text-slate-600">"{req.reason}"</p>
                    </div>
                  )}

                  {req.adminNote && (
                    <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                      <div className="flex items-center gap-2 mb-2 text-destructive">
                        <MessageSquareText className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Feedback Amministrazione:</span>
                      </div>
                      <p className="text-sm font-bold text-destructive italic">"{req.adminNote}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm py-20">
            <CardContent className="flex flex-col items-center justify-center gap-4 opacity-40">
              <Info className="h-10 w-10" />
              <p className="text-center font-bold italic">Nessuna richiesta inviata finora.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
