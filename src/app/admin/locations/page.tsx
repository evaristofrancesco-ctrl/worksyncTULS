
"use client"

import { useState } from "react"
import { MapPin, Plus, Search, MoreVertical, Building2, Trash2, Edit, Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LocationsPage() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  
  const { data: locations, isLoading } = useCollection(locationsQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    city: "",
  })

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.city) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Nome e Città sono obbligatori.",
      })
      return
    }

    const locId = `loc-${Date.now()}`
    const locRef = doc(db, "companies", "default", "locations", locId)
    
    const locationData = {
      id: locId,
      name: (newLocation.name || "").trim(),
      address: (newLocation.address || "").trim(),
      city: (newLocation.city || "").trim(),
      companyId: "default"
    }

    setDocumentNonBlocking(locRef, locationData, { merge: true })

    setIsDialogOpen(false)
    setNewLocation({ name: "", address: "", city: "" })
    
    toast({
      title: "Sede creata",
      description: "La nuova sede è stata aggiunta correttamente.",
    })
  }

  const handleDeleteLocation = (id: string) => {
    const locRef = doc(db, "companies", "default", "locations", id)
    deleteDocumentNonBlocking(locRef)
    toast({
      title: "Sede eliminata",
      description: "La sede è stata rimossa dal sistema.",
    })
  }

  const filteredLocations = locations?.filter(loc => 
    (loc.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.city || "").toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Sedi Operative</h1>
          <p className="text-muted-foreground">Gestisci i luoghi di lavoro della tua azienda.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90">
              <Plus className="h-4 w-4" />
              Aggiungi Sede
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#227FD8]" />
                Nuova Sede Operativa
              </DialogTitle>
              <DialogDescription>
                Inserisci i dettagli del nuovo ufficio o filiale.
              </DialogDescription>
            </DialogHeader>
            
            {(!user && !isUserLoading) && (
              <Alert variant="destructive" className="my-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Sessione non attiva</AlertTitle>
                <AlertDescription>
                  L'accesso non è stato rilevato. Il salvataggio potrebbe fallire se non sei autenticato correttamente.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome Sede</Label>
                <Input 
                  id="name" 
                  placeholder="es. Ufficio Nord" 
                  className="col-span-3" 
                  value={newLocation.name || ""}
                  onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="city" className="text-right">Città</Label>
                <Input 
                  id="city" 
                  placeholder="es. Milano" 
                  className="col-span-3"
                  value={newLocation.city || ""}
                  onChange={(e) => setNewLocation({...newLocation, city: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Indirizzo</Label>
                <Input 
                  id="address" 
                  placeholder="es. Via delle Industrie 1" 
                  className="col-span-3"
                  value={newLocation.address || ""}
                  onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleAddLocation} className="bg-[#227FD8]">Salva Sede</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold">Elenco Sedi</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca sede o città..."
                className="pl-8 bg-muted/30 border-none focus-visible:ring-[#227FD8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Nome</TableHead>
                <TableHead className="font-bold">Città</TableHead>
                <TableHead className="font-bold">Indirizzo</TableHead>
                <TableHead className="text-right font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredLocations.map((loc) => (
                <TableRow key={loc.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-bold text-[#1e293b]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#227FD8]" />
                      {loc.name}
                    </div>
                  </TableCell>
                  <TableCell>{loc.city}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.address}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer"
                          onClick={() => handleDeleteLocation(loc.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredLocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nessuna sede trovata.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
