
"use client"

import { useState } from "react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Info, Plus, Trash2, Edit, Loader2, Save, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"

export default function AdminUtilitiesPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ title: "", description: "", category: "" })

  const utilitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "utilities"), orderBy("createdAt", "desc"));
  }, [db])

  const { data: utilities, isLoading } = useCollection(utilitiesQuery)

  const handleAdd = () => {
    if (!db || !formData.title || !formData.description) {
      toast({ variant: "destructive", title: "Errore", description: "Titolo e descrizione sono obbligatori." })
      return
    }
    const id = `util-${Date.now()}`
    const ref = doc(db, "utilities", id)
    setDocumentNonBlocking(ref, { 
      ...formData, 
      id, 
      createdAt: new Date().toISOString() 
    }, { merge: true })
    
    setIsAddOpen(false)
    setFormData({ title: "", description: "", category: "" })
    toast({ title: "Utility Creata", description: "L'informazione è ora visibile a tutto il team." })
  }

  const handleUpdate = () => {
    if (!db || !editingItem) return
    const ref = doc(db, "utilities", editingItem.id)
    updateDocumentNonBlocking(ref, {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      updatedAt: new Date().toISOString()
    })
    setIsEditOpen(false)
    setEditingItem(null)
    setFormData({ title: "", description: "", category: "" })
    toast({ title: "Aggiornato", description: "Le modifiche sono state salvate." })
  }

  const handleDelete = (id: string) => {
    if (!db) return
    const ref = doc(db, "utilities", id)
    deleteDocumentNonBlocking(ref)
    toast({ title: "Eliminato", description: "L'utility è stata rimossa." })
  }

  const openEdit = (item: any) => {
    setEditingItem(item)
    setFormData({ title: item.title, description: item.description, category: item.category || "" })
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3">
            <Info className="h-8 w-8 text-[#227FD8]" />
            Gestione UTILITY
          </h1>
          <p className="text-muted-foreground">Crea e gestisci le informazioni utili visibili a tutti i dipendenti.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] font-black h-11 px-6 shadow-md">
              <Plus className="h-5 w-5" /> Aggiungi Info
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-black text-2xl uppercase">Nuova Utility</DialogTitle>
              <DialogDescription>Inserisci i dettagli dell'informazione aziendale.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold">Titolo *</Label>
                <Input 
                  placeholder="es. Orari Festività o Password WiFi" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Categoria (opzionale)</Label>
                <Input 
                  placeholder="es. Comunicazioni, Sicurezza, IT" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Descrizione / Contenuto *</Label>
                <Textarea 
                  className="min-h-[200px]"
                  placeholder="Inserisci qui tutto il testo informativo..." 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleAdd} className="bg-[#227FD8] font-black h-11 px-8">PUBBLICA</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
        ) : utilities && utilities.length > 0 ? (
          utilities.map((item) => (
            <Card key={item.id} className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  {item.category && (
                    <Badge variant="outline" className="mb-2 bg-[#227FD8]/5 text-[#227FD8] border-[#227FD8]/20 font-black text-[9px] uppercase tracking-widest">
                      {item.category}
                    </Badge>
                  )}
                  <CardTitle className="font-black text-xl text-[#1e293b]">{item.title}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#227FD8]" onClick={() => openEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed gap-4 opacity-50">
            <Info className="h-12 w-12" />
            <p className="font-bold">Nessuna utility creata. Inizia aggiungendone una!</p>
          </div>
        )}
      </div>

      {/* Dialog Modifica */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl uppercase">Modifica Utility</DialogTitle>
            <DialogDescription>Aggiorna il contenuto dell'informazione aziendale.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Titolo *</Label>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Categoria</Label>
              <Input 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Descrizione / Contenuto *</Label>
              <Textarea 
                className="min-h-[200px]"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleUpdate} className="bg-[#227FD8] font-black h-11 px-8">SALVA MODIFICHE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
