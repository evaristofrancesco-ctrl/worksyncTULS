"use client"

import React, { useState, useMemo, useEffect } from "react"
import { MapPin, Plus, Search, MoreVertical, Building2, Trash2, Edit, Loader2, ArrowRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
      <div className="bg-[#1e293b] p-8 text-white rounded-t-[2.5rem]">
        <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-4">Punti Vendita</Badge>
        <DialogTitle className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
          {submitLabel === 'SALVA MODIFICHE' ? <Edit className="h-7 w-7" /> : <Building2 className="h-7 w-7" />} 
          {title}
        </DialogTitle>
        <DialogDescription className="text-slate-400 font-medium mt-1">Configura i dettagli operativi per questa sede di TU.L.S.</DialogDescription>
      </div>
      
      <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Nome della Sede *</Label>
          <div className="relative">
             <Building2 className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
             <Input 
                placeholder="es. Punto Vendita Centrale" 
                className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]"
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Città *</Label>
            <div className="relative">
              <Home className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="es. Roma" 
                className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]"
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Indirizzo Completo</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="es. Via del Corso 1" 
                className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]"
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3 rounded-b-[2.5rem]">
        <Button variant="ghost" onClick={onCancel} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex-1">Annulla</Button>
        <Button 
          onClick={() => onSubmit({ ...initialData, ...formData })} 
          className="rounded-2xl h-14 bg-[#1e293b] hover:bg-black font-black text-[10px] uppercase tracking-widest flex-1 px-8 shadow-xl"
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

  useEffect(() => {
    if (editingLoc) {
      setIsEditOpen(true)
    }
  }, [editingLoc])

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
    setEditingLoc(null)
    toast({ title: "Modifiche Salvate", description: "Sede aggiornata con successo." })
  }

  const handleDelete = (id: string) => {
    if (!db) return
    const ref = doc(db, "companies", "default", "locations", id)
    deleteDocumentNonBlocking(ref)
    toast({ title: "Sede Eliminata", description: "Il record è stato rimosso." })
  }

  const handleEditClick = (loc: any) => {
    setEditingLoc(loc)
  }

  const filteredLocations = useMemo(() => {
    if (!locations) return []
    const q = searchQuery.toLowerCase()
    return locations.filter(l => 
      (l.name || "").toLowerCase().includes(q) || 
      (l.city || "").toLowerCase().includes(q)
    )
  }, [locations, searchQuery])

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- REFINED HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Network Operativo
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter">Sedi Operative</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <MapPin className="h-3 w-3" /> 
            {filteredLocations.length} punti vendita attivi
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-12 px-8 rounded-2xl shadow-lg shadow-blue-500/20 text-[10px] uppercase tracking-widest">
              <Plus className="h-4 w-4 mr-2" /> Nuova Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
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

      {/* --- NEW FILTER BAR --- */}
      <div className="bg-[#1e293b] p-3 rounded-3xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-[#227FD8]" />
            <Input 
              placeholder="Cerca per nome sede o città..." 
              className="pl-11 h-11 border-none bg-white/5 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#227FD8] transition-all" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <Button 
            variant="ghost" 
            className="h-11 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest" 
            onClick={() => setSearchQuery("")}
          >
            Reset Filtri
          </Button>
        </div>
      </div>

      {/* --- LOCATIONS GRID --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-24 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Caricamento sedi...</p>
          </div>
        ) : filteredLocations.length > 0 ? filteredLocations.map((loc) => (
          <div key={loc.id} className="group relative bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/30 transition-all duration-500 overflow-hidden">
            {/* Soft Glow Background */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#227FD8] blur-[80px] opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.07]" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#227FD8] shadow-sm ring-1 ring-slate-100 group-hover:bg-[#227FD8] group-hover:text-white transition-all duration-500">
                  <Building2 className="h-7 w-7" />
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl text-slate-300 hover:text-[#227FD8] hover:bg-[#227FD8]/5"
                    onClick={() => handleEditClick(loc)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-48">
                      <DropdownMenuItem 
                        className="text-rose-600 font-black text-[10px] uppercase tracking-widest cursor-pointer py-3 rounded-xl focus:bg-rose-50"
                        onSelect={() => handleDelete(loc.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Elimina Sede
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div>
                <h3 className="font-black text-xl text-[#1e293b] tracking-tight group-hover:text-[#227FD8] transition-colors">{loc.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-200 text-slate-400">
                    ID: {loc.id.split('-').pop()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-[#227FD8]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{loc.city}</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span className="text-xs font-medium text-slate-500 italic leading-relaxed">{loc.address || "Indirizzo non specificato"}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="ghost" className="group/btn h-10 pr-0 font-black text-[9px] uppercase tracking-widest text-[#227FD8] hover:bg-transparent">
                  Vedi dettagli <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6 group hover:rotate-12 transition-transform">
              <Building2 className="h-10 w-10 text-slate-200 group-hover:text-[#227FD8]" />
            </div>
            <h3 className="text-xl font-black text-[#1e293b] tracking-tight">Nessuna sede trovata</h3>
            <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">
               Non ci sono punti vendita che corrispondono ai filtri attuali.
            </p>
            <Button 
              variant="outline" 
              className="mt-8 rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest border-slate-200 px-8"
              onClick={() => setSearchQuery("")}
            >
              Reset di tutti i filtri
            </Button>
          </div>
        )}
      </div>

      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingLoc(null);
      }}>
        <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          {editingLoc && (
            <LocationForm 
              key={editingLoc.id}
              initialData={editingLoc}
              onSubmit={handleUpdate}
              onCancel={() => {
                setIsEditOpen(false);
                setEditingLoc(null);
              }}
              title="Modifica Sede Operativa"
              submitLabel="SALVA MODIFICHE"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
