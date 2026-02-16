
"use client"

import React, { useState, useMemo, useCallback } from "react"
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

/**
 * Componente per il Form della Sede - Isolato per evitare freeze del genitore
 */
const LocationForm = React.memo(({ 
  initialData, 
  onSubmit, 
  onCancel, 
  title 
}: { 
  initialData: any, 
  onSubmit: (data: any) => void, 
  onCancel: () => void, 
  title: string 
}) => {
  const [formData, setFormData] = useState(initialData)

  return (
    <div className="flex flex-col h-full">
      <div className="bg-[#227FD8] p-6 text-white rounded-t-lg">
        <DialogTitle className="flex items-center gap-2 text-2xl font-black">
          {title.includes('Modifica') ? <Edit className="h-6 w-6" /> : <Building2 className="h-6 w-6" />} {title}
        </DialogTitle>
        <DialogDescription className="text-blue-100">
          Inserisci i dettagli per la gestione della sede operativa dell'azienda.
        </DialogDescription>
      </div>
      <div className="grid gap-6 p-6 flex-1">
        <div className="space-y-2">
          <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">Nome Sede *</Label>
          <Input 
            placeholder="es. Punto Vendita Centro" 
            className="h-12 border-slate-200 focus-visible:ring-[#227FD8]"
            value={formData.name || ""} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">Città *</Label>
            <Input 
              placeholder="es. Roma" 
              className="h-12 border-slate-200 focus-visible:ring-[#227FD8]"
              value={formData.city || ""} 
              onChange={(e) => setFormData({...formData, city: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">Indirizzo</Label>
            <Input 
              placeholder="es. Via del Corso 15" 
              className="h-12 border-slate-200 focus-visible:ring-[#227FD8]"
              value={formData.address || ""} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
            />
          </div>
        </div>
      </div>
      <DialogFooter className="p-6 bg-slate-50 rounded-b-lg border-t">
        <Button variant="ghost" onClick={onCancel} className="font-bold">Annulla</Button>
        <Button 
          onClick={() => onSubmit(formData)} 
          className="bg-[#227FD8] hover:bg-[#227FD8]/90 h-12 px-8 font-black uppercase shadow-md"
        >
          Salva Sede
        </Button>
      </DialogFooter>
    </div>
  )
})
LocationForm.displayName = "LocationForm"

/**
 * Componente Tabella Sedi - Memoizzato per evitare ri-render inutili
 */
const LocationsTable = React.memo(({ 
  locations, 
  isLoading, 
  onEdit, 
  onDelete 
}: { 
  locations: any[], 
  isLoading: boolean, 
  onEdit: (loc: any) => void, 
  onDelete: (id: string) => void 
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" />
        <p className="mt-2 text-sm text-muted-foreground font-medium">Caricamento sedi...</p>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground italic">
        Nessuna sede operativa trovata.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead className="font-black pl-6">Nome Sede</TableHead>
          <TableHead className="font-black">Località</TableHead>
          <TableHead className="font-black">Indirizzo Completo</TableHead>
          <TableHead className="text-right font-black pr-6">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((loc) => (
          <TableRow key={loc.id} className="hover:bg-muted/10 transition-colors border-b last:border-0">
            <TableCell className="font-bold text-[#1e293b] pl-6 py-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8]">
                  <Building2 className="h-4 w-4" />
                </div>
                {loc.name}
              </div>
            </TableCell>
            <TableCell className="font-bold text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                {loc.city}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm italic">{loc.address || "Indirizzo non specificato"}</TableCell>
            <TableCell className="text-right pr-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="cursor-pointer font-bold" onClick={() => onEdit(loc)}>
                    <Edit className="h-4 w-4 mr-2" /> Modifica
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive cursor-pointer font-bold"
                    onClick={() => onDelete(loc.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
LocationsTable.displayName = "LocationsTable"

export default function LocationsPage() {
  const db = useFirestore()
  const { toast } = useToast()

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  
  const { data: locations, isLoading } = useCollection(locationsQuery)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleAddLocation = useCallback((data: any) => {
    if (!data.name || !data.city || !db) return
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
    toast({ title: "Sede Aggiunta", description: `${data.name} registrata.` })
  }, [db, toast])

  const handleUpdateLocation = useCallback((data: any) => {
    if (!data.name || !data.city || !db) return
    const locRef = doc(db, "companies", "default", "locations", data.id)
    updateDocumentNonBlocking(locRef, {
      name: (data.name || "").trim(),
      address: (data.address || "").trim(),
      city: (data.city || "").trim(),
    })
    setIsEditDialogOpen(false)
    setEditingLocation(null)
    toast({ title: "Sede Aggiornata", description: "Modifiche salvate." })
  }, [db, toast])

  const handleDeleteLocation = useCallback((id: string) => {
    if (!db) return
    const locRef = doc(db, "companies", "default", "locations", id)
    deleteDocumentNonBlocking(locRef)
    toast({ title: "Sede Rimossa", description: "La sede è stata eliminata." })
  }, [db, toast])

  const filteredLocations = useMemo(() => {
    if (!locations) return []
    if (!searchQuery) return locations
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
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Gestione Sedi Operative</h1>
          <p className="text-muted-foreground">Configura i punti vendita o gli uffici gestiti da TU.L.S.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 h-11 px-6 shadow-md font-bold">
              <Plus className="h-5 w-5" /> Aggiungi Nuova Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
            <LocationForm 
              initialData={{ name: "", address: "", city: "" }}
              onSubmit={handleAddLocation}
              onCancel={() => setIsAddDialogOpen(false)}
              title="Nuova Sede Operativa"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-[#1e293b]">Elenco Sedi Attive</CardTitle>
              <CardDescription>Visualizza e gestisci l'anagrafica dei luoghi di lavoro.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o città..."
                className="pl-9 bg-muted/40 border-none h-10 focus-visible:ring-[#227FD8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LocationsTable 
            locations={filteredLocations}
            isLoading={isLoading}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteLocation}
          />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
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
