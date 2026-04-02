
"use client"

import { useState } from "react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import { it } from "date-fns/locale"

export default function AdminHolidaysPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), name: "" })

  const holidaysQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "holidays"), orderBy("date", "asc"));
  }, [db])

  const { data: holidays, isLoading } = useCollection(holidaysQuery)

  const handleAdd = () => {
    if (!db || !formData.date || !formData.name) {
      toast({ variant: "destructive", title: "Errore", description: "Data e nome sono obbligatori." })
      return
    }
    const id = formData.date // Use date as ID to prevent duplicates on same day
    const ref = doc(db, "holidays", id)
    setDocumentNonBlocking(ref, { 
      ...formData, 
      id, 
      createdAt: new Date().toISOString() 
    }, { merge: true })
    
    setIsAddOpen(false)
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), name: "" })
    toast({ title: "Festività Aggiunta", description: "Il giorno è stato segnato come festivo." })
  }

  const handleDelete = (id: string) => {
    if (!db) return
    const ref = doc(db, "holidays", id)
    deleteDocumentNonBlocking(ref)
    toast({ title: "Eliminato", description: "La festività è stata rimossa." })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3 underline decoration-[#227FD8] decoration-4 underline-offset-4">
            <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
            Gestione FESTIVITÀ
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">Configura i giorni di chiusura aziendale (esclusi dal calcolo ore lavorative).</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] font-black h-11 px-6 shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-5 w-5" /> Aggiungi Festivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="font-black text-2xl uppercase tracking-tighter text-slate-800">Nuovo Giorno Festivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Data del Festivo</Label>
                <Input 
                  type="date"
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="h-12 font-bold rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-500 tracking-widest">Nome Festività</Label>
                <Input 
                  placeholder="es. Lunedì dell'Angelo, Natale..." 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-12 font-bold rounded-xl border-slate-200"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="font-bold h-12 uppercase tracking-widest">Annulla</Button>
              <Button onClick={handleAdd} className="bg-[#227FD8] font-black h-12 px-8 uppercase tracking-widest shadow-lg rounded-xl">SALVA</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
        ) : holidays && holidays.length > 0 ? (
          holidays.map((item) => (
            <Card key={item.id} className="border-none shadow-sm bg-white/80 backdrop-blur-sm group hover:shadow-md transition-all rounded-3xl overflow-hidden border-l-4 border-l-amber-400">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-600 uppercase tracking-tighter">
                      {format(parseISO(item.date), 'EEEE', { locale: it })}
                    </span>
                    <CardTitle className="font-black text-lg text-[#1e293b] leading-none">
                      {format(parseISO(item.date), 'dd MMMM yyyy', { locale: it })}
                    </CardTitle>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                  {item.name}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200 gap-6">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
              <Star className="h-10 w-10" />
            </div>
            <div className="text-center">
              <p className="font-black text-xl text-slate-400 uppercase tracking-tighter">Nessun festivo registrato</p>
              <p className="text-slate-400 text-sm mt-1">Aggiungi i giorni di chiusura per aggiornare i report.</p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4 border-slate-200 font-black tracking-widest text-xs uppercase px-8 rounded-xl">Inizia Ora</Button>
          </div>
        )}
      </div>
    </div>
  )
}
