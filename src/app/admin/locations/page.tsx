
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
 * Componente Form isolato per evitare re-render della pagina durante la digitazione.
 */
function LocationForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  title,
  submitLabel
}: { 
  initialData: any, 
  onSubmit: (data: any) => void, 
  onCancel: () => void, 
  title: string,
  submitLabel: string
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    city: initialData?.city || "",
    address: initialData?.address || ""
  })

  return (
    <div className="flex flex-col">
      <div className="bg-[#227FD8] p-6 text-white">
        <DialogTitle className="flex items-center gap-2 text-2xl font-black">
          {submitLabel === 'SALVA MODIFICHE' ? <Edit className="h-6 w-6" /> : <Building2 className="h-6 w-6" />} {title}
        </DialogTitle>
        <DialogDescription className="text-blue-100">
          Configura i dettagli operativi per questa sede di TU.L.S.
        </DialogDescription>
      </div>
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <Label className="font-bold text-xs uppercase text-slate-500">Nome della Sede *</Label>
          <Input 
            placeholder="es. Punto Vendita Centrale" 
            className="h-11"
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase text-slate-500">Città *</Label>
            <Input 
              placeholder="es. Roma" 
              className="h-11"
              value={formData.city} 
              onChange={(e) => setFormData({...formData, city: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase text-slate-500">Indirizzo</Label>
            <Input 
              placeholder="es. Via del Corso 1" 
              className="h-11"
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
            />
          </div>
        </div>
      </div>
      <DialogFooter className="p-6 bg-slate-50 border-t">
        <Button variant="ghost" onClick={onCancel} className="font-bold">Annulla</Button>
        <Button 
          onClick={() => onSubmit({ ...initialData, ...formData })} 
          className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black uppercase px-8 h-11"
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}

export default function LocationsPage() {
  const db = useFirestore()
  const { toast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingLoc, setEditingLoc] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations, isLoading } = useCollection(locationsQuery)

  const handleAdd = (data: any) => {
    if (!db || !data.name || !data.city) {
      toast({ variant: "destructive", title: "Errore", description: "Nome e città sono obbligatori." })
      return
    }
    const id = `loc-${Date.now()}`
    const ref = doc(db, "companies", "default", "locations", id)
    setDocumentNonBlocking(ref, { ...data, id, companyId: "default" }, { merge: true })
    setIsAddOpen(false)
    toast({ title: "Sede Aggiunta", description: `${data.name} è stata registrata.` })
  }

  const handleUpdate = (data: any) => {
    if (!db || !data.id) return
    const ref = doc(db, "companies", "default", "locations", data.id)
    updateDocumentNonBlocking(ref, {
      name: data.name,
      city: data.city,
      address: data.address
    })
    setIsEditOpen(false)
    toast({ title: "Modifiche Salvate", description: "Sede aggiornata con successo." })
  }

  const handleDelete = useCallback((id: string) => {
    if (!db) return
    const ref = doc(db, "companies", "default", "locations", id)
    deleteDocumentNonBlocking(ref)
    toast({ title: "Sede Eliminata", description: "Il record è stato rimosso." })
  }, [db, toast])

  const openEditDialog = useCallback((loc: any) => {
    setEditingLoc(loc)
    // Piccola attesa per evitare conflitti con la chiusura del DropdownMenu
    // Questo previene il blocco dell'interfaccia tipico di Radix UI
    setTimeout(() => {
      setIsEditOpen(true)
    }, 50)
  }, [])

  const filteredLocations = useMemo(() => {
    if (!locations) return []
    const q = searchQuery.toLowerCase()
    return locations.filter(l => 
      (l.name || "").toLowerCase().includes(q) || 
      (l.city || "").toLowerCase().includes(q)
    )
  }, [locations, searchQuery])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Gestione Sedi Operative</h1>
          <p className="text-muted-foreground">Monitora e configura i luoghi di lavoro del team TU.L.S.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 h-11 px-6 shadow-md font-bold">
              <Plus className="h-5 w-5" /> Nuova Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl overflow-hidden">
            <LocationForm 
              initialData={{ name: "", city: "", address: "" }}
              onSubmit={handleAdd}
              onCancel={() => setIsAddOpen(false)}
              title="Aggiungi Punto Vendita"
              submitLabel="SALVA SEDE"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-[#1e293b]">Elenco Sedi</CardTitle>
              <CardDescription>Visualizza l'anagrafica completa dei punti operativi.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca sede o città..."
                className="pl-9 bg-muted/40 border-none h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead className="font-black pl-6">Sede</TableHead>
                  <TableHead className="font-black">Località</TableHead>
                  <TableHead className="font-black">Indirizzo</TableHead>
                  <TableHead className="text-right font-black pr-6">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length > 0 ? filteredLocations.map((loc) => (
                  <TableRow key={loc.id} className="hover:bg-muted/10 border-b last:border-0">
                    <TableCell className="font-bold text-[#1e293b] pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8]">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <span className="text-sm">{loc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                        {loc.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm italic">{loc.address || "---"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => openEditDialog(loc)}>
                            <Edit className="h-4 w-4 mr-2" /> Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive font-bold cursor-pointer"
                            onClick={() => handleDelete(loc.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">Nessuna sede trovata.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl overflow-hidden">
          {editingLoc && (
            <LocationForm 
              initialData={editingLoc}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditOpen(false)}
              title="Modifica Sede Operativa"
              submitLabel="SALVA MODIFICHE"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
