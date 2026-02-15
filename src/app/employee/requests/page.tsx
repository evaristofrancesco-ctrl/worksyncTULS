"use client"

import { Plus, Clock, CheckCircle2, XCircle, Info } from "lucide-react"
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

export default function MyRequestsPage() {
  const myRequests = [
    { id: 1, type: "Ferie", dates: "01 Mag - 05 Mag", status: "In Attesa", reason: "Viaggio di famiglia" },
    { id: 2, type: "Malattia", dates: "24 Apr", status: "Approvato", reason: "Influenza stagionale" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Le Mie Richieste</h1>
          <p className="text-muted-foreground">Gestisci le tue richieste di ferie e permessi.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary">
              <Plus className="h-4 w-4" /> Nuova Richiesta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invia Nuova Richiesta</DialogTitle>
              <DialogDescription>
                Compila il modulo per richiedere ferie o permessi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo di Richiesta</Label>
                <Select defaultValue="VACATION">
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
                  <Label>Data Inizio</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Data Fine</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivazione (opzionale)</Label>
                <Textarea placeholder="Breve descrizione..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost">Annulla</Button>
              <Button>Invia Richiesta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {myRequests.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${req.status === 'Approvato' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {req.status === 'Approvato' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold">{req.type}</h3>
                    <p className="text-sm text-muted-foreground">{req.dates}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Stato</p>
                    <p className="font-medium text-sm">{req.status}</p>
                  </div>
                  <Badge variant={req.status === 'Approvato' ? 'default' : 'secondary'}>
                    {req.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-1 font-bold uppercase">Motivazione:</p>
                <p className="text-sm italic">"{req.reason}"</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <Info className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Hai ancora <span className="font-bold text-foreground">12 giorni</span> di ferie rimanenti per quest'anno.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
