"use client"

import { useState } from "react"
import { MapPin, Plus, Search, MoreVertical, Building2 } from "lucide-react"
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
import { mockLocations as initialLocations } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Location } from "@/lib/types"

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>(initialLocations)
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

    const locationToAdd: Location = {
      id: `loc-${Date.now()}`,
      ...newLocation
    }

    setLocations([...locations, locationToAdd])
    setIsDialogOpen(false)
    setNewLocation({ name: "", address: "", city: "" })
    
    toast({
      title: "Sede aggiunta",
      description: `${newLocation.name} è stata registrata correttamente.`,
    })
  }

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome Sede</Label>
                <Input 
                  id="name" 
                  placeholder="es. Ufficio Nord" 
                  className="col-span-3" 
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="city" className="text-right">Città</Label>
                <Input 
                  id="city" 
                  placeholder="es. Milano" 
                  className="col-span-3"
                  value={newLocation.city}
                  onChange={(e) => setNewLocation({...newLocation, city: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Indirizzo</Label>
                <Input 
                  id="address" 
                  placeholder="es. Via delle Industrie 1" 
                  className="col-span-3"
                  value={newLocation.address}
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

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold">Elenco Sedi</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca sede o città..."
                className="pl-8 bg-muted/30 border-none"
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
                <TableHead>Nome</TableHead>
                <TableHead>Città</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-bold text-[#1e293b]">{loc.name}</TableCell>
                  <TableCell>{loc.city}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.address}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
