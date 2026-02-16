
"use client"

import { useState, useMemo, useCallback } from "react"
import { MapPin, Plus, Search, MoreVertical, Building2, Trash2, Edit, Loader2 } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"

// Componente isolato per il form delle sedi per evitare re-render pesanti della pagina durante la digitazione
function LocationForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  title 
}: { 
  initialData: any, 
  onSubmit: (data: any) => void, 
  onCancel: () => void, 
  title: string 
}) {
  const [formData, setFormData] = useState(initialData)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-black">
          {title.includes('Modifica') ? <Edit className="h-5 w-5 text-[#227FD8]" /> : <Building2 className="h-5 w-5 text-[#227FD8]" />} {title}
        </DialogTitle>
        <DialogDescription>Inserisci i dettagli per la gestione della sede operativa.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label className="font-bold">Nome Sede *</Label>
          <Input 
            placeholder="es. Ufficio Nord" 
            value={formData.name || ""} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold">Città *</Label>
            <Input 
              placeholder="es. Milano" 
              value={formData.city || ""} 
              onChange={(e) => setFormData({...formData, city: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Indirizzo</Label>
            <Input 
              placeholder="es. Via delle Industrie 1" 
              value={formData.address || ""} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} className="font-bold">Annulla</Button>
        <Button onClick={() => onSubmit(formData)} className="bg-[#227FD8] font-black uppercase">Salva Sede</Button>
      </DialogFooter>
    </>
  )
}

export default function LocationsPage() {
  const db = useFirestore()
  const { toast } = useToast()

  // Query memoizzata per Firestore
  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  
  const { data: locations, isLoading } = useCollection(locationsQuery)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleAddLocation = (data: any) => {
    if (!data.name || !data.city) {
      toast({ variant: "destructive", title: "Errore", description: "Nome e Città sono obbligatori." })
      return
    }

    const locId = `loc-${Date.now()}`
    const locRef = doc(db, "companies", "default", "locations", locId)
    
    setDocumentNonBlocking(locRef, {
      id: locId,
      name: (data.name || "").trim(),
      address: (data.address || "").trim(),
      city: (data.city || "").trim(),
      companyId: "default"
    }, { merge: true })

    setIsAddDialogOpen(false)
    toast({ title: "Sede creata", description: "La nuova sede è stata aggiunta correttamente." })
  }

  const handleUpdateLocation = (data: any) => {
    if (!data.name || !data.city) return

    const locRef = doc(db, "companies", "default", "locations", data.id)
    updateDocumentNonBlocking(locRef, {
      name: (data.name || "").trim(),
      address: (data.address || "").trim(),
      city: (data.city || "").trim(),
    })

    setIsEditDialogOpen(false)
    setEditingLocation(null)
    toast({ title: "Sede Aggiornata", description: "Le modifiche sono state salvate." })
  }

  const handleDeleteLocation = useCallback((id: string) => {
    const locRef = doc(db, "companies", "default", "locations", id)
    deleteDocumentNonBlocking(locRef)
    toast({ title: "Sede eliminata", description: "La sede è stata rimossa dal sistema." })
  }, [db, toast])

  // Memoizzazione della ricerca per evitare ricalcoli costosi
  const filteredLocations = useMemo(() => {
    if (!locations) return []
    const q = searchQuery.toLowerCase()
    return locations.filter(loc => 
      (loc.name || "").toLowerCase().includes(q) ||
      (loc.city || "").toLowerCase().includes(q)
    )
  }, [locations, searchQuery])

  const handleOpenEdit = useCallback((loc: any) => {
    setEditingLocation(loc)
    setIsEditDialogOpen(true)
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Sedi Operative</h1>
          <p className="text-muted-foreground">Gestisci i luoghi di lavoro della tua azienda.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 h-11 px-6 shadow-md font-bold">
              <Plus className="h-5 w-5" /> Aggiungi Sede
            </Button>
          </DialogTrigger>
          <DialogContent>
            <LocationForm 
              initialData={{ name: "", address: "", city: "" }}
              onSubmit={handleAddLocation}
              onCancel={() => setIsAddDialogOpen(false)}
              title="Nuova Sede Operativa"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-black">Elenco Sedi</CardTitle>
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
                <TableHead className="font-black">Nome</TableHead>
                <TableHead className="font-black">Città</TableHead>
                <TableHead className="font-black">Indirizzo</TableHead>
                <TableHead className="text-right font-black pr-6">Azioni</TableHead>
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
                  <TableCell className="font-medium text-sm">{loc.city}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{loc.address}</TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="cursor-pointer font-bold" onClick={() => handleOpenEdit(loc)}>
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer font-bold"
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
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                    Nessuna sede trovata.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog separato per la modifica per gestire meglio lo stato */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          {editingLocation && (
            <LocationForm 
              initialData={editingLocation}
              onSubmit={handleUpdateLocation}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setEditingLocation(null)
              }}
              title="Modifica Sede Operativa"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
