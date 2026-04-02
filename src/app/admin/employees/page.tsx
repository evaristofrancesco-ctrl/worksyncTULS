"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  ImageIcon, 
  Trash2, 
  Loader2, 
  Edit, 
  ShieldCheck, 
  User, 
  Briefcase,
  Lock,
  Mail,
  Zap,
  Clock,
  Award,
  ArrowRight,
  MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"

const DAYS_OF_WEEK = [
  { label: "Lunedì", value: "1" },
  { label: "Martedì", value: "2" },
  { label: "Mercoledì", value: "3" },
  { label: "Giovedì", value: "4" },
  { label: "Venerdì", value: "5" },
  { label: "Sabato", value: "6" },
  { label: "Domenica", value: "0" },
]

function EmployeeForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  locations, 
  title, 
  submitLabel 
}: { 
  initialData: any, 
  onSubmit: (data: any) => void, 
  onCancel: () => void, 
  locations: any[], 
  title: string, 
  submitLabel: string 
}) {
  const [formData, setFormData] = useState({
    ...initialData,
    autoClockIn: initialData?.autoClockIn ?? true
  })

  const handleContractChange = (type: string) => {
    const hours = type === 'full-time' ? 40 : 20
    setFormData({ ...formData, contractType: type, weeklyHours: hours })
  }

  return (
    <div className="flex flex-col">
      <div className="bg-[#1e293b] p-8 text-white rounded-t-[2.5rem]">
        <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-4">Anagrafica Team</Badge>
        <DialogTitle className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
          {submitLabel === 'SALVA MODIFICHE' ? <Edit className="h-7 w-7" /> : <UserPlus className="h-7 w-7" />} 
          {title}
        </DialogTitle>
        <DialogDescription className="text-slate-400 font-medium mt-1">Configura il profilo professionale e i permessi del collaboratore.</DialogDescription>
      </div>
      
      <Tabs defaultValue="personali" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-16 bg-slate-50 p-1 rounded-none border-b border-slate-100">
          <TabsTrigger value="personali" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="h-4 w-4" /> Dati Personali
          </TabsTrigger>
          <TabsTrigger value="lavoro" className="font-black text-[10px] uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Briefcase className="h-4 w-4" /> Impostazioni Lavoro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personali" className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Nome *</Label>
              <Input className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="es. Mario" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Cognome *</Label>
              <Input className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="es. Rossi" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div className="space-y-3">
            <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Email Aziendale *</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
              <Input className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="mario.rossi@tulas.it" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Password Accesso *</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                <Input type="password" dir="ltr" className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">URL Avatar (Opzionale)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                <Input className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="https://..." value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <div className="space-y-1">
              <Label className="text-sm font-black text-[#1e293b] uppercase tracking-tight">Privilegi Amministratore</Label>
              <p className="text-[11px] text-slate-500 font-medium">Abilita l'accesso completo alla dashboard gestionale.</p>
            </div>
            <Switch checked={formData.isAdmin} onCheckedChange={v => setFormData({...formData, isAdmin: v})} />
          </div>
        </TabsContent>

        <TabsContent value="lavoro" className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Mansione / Qualifica *</Label>
              <div className="relative">
                <Award className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                <Input className="pl-11 h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" placeholder="es. Store Manager" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Sede di Riferimento</Label>
              <Select value={formData.locationId} onValueChange={v => setFormData({...formData, locationId: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {locations?.map(loc => <SelectItem key={loc.id} value={loc.id} className="font-bold">{loc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Tipologia Contratto</Label>
              <Select value={formData.contractType} onValueChange={handleContractChange}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  <SelectItem value="full-time" className="font-bold">Full-time (40h)</SelectItem>
                  <SelectItem value="part-time" className="font-bold">Part-time (20h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Ore Settimanali</Label>
              <Input className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" type="number" value={formData.weeklyHours} onChange={e => setFormData({...formData, weeklyHours: Number(e.target.value)})} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Giorno Riposo</Label>
              <Select value={formData.restDay} onValueChange={v => setFormData({...formData, restDay: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value} className="font-bold">{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Inizio Riposo</Label>
              <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" value={formData.restStartTime} onChange={e => setFormData({...formData, restStartTime: e.target.value})} />
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Fine Riposo</Label>
              <Input type="time" className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-[#227FD8]" value={formData.restEndTime} onChange={e => setFormData({...formData, restEndTime: e.target.value})} />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-200/50">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-black text-[#1e293b] uppercase tracking-tight">Timbratura Automatica</Label>
                <p className="text-[11px] text-slate-500 font-medium italic">Generazione log presenze automatica.</p>
              </div>
            </div>
            <Switch checked={formData.autoClockIn} onCheckedChange={v => setFormData({...formData, autoClockIn: v})} />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest flex-1">Annulla</Button>
        <Button onClick={() => onSubmit(formData)} className="rounded-2xl h-14 bg-[#1e293b] hover:bg-black font-black text-[10px] uppercase tracking-widest flex-1 px-8 shadow-xl">
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}

export default function EmployeesPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees, isLoading: employeesLoading } = useCollection(employeesQuery)
  
  const locationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "companies", "default", "locations");
  }, [db])
  const { data: locations } = useCollection(locationsQuery)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEmployeeData, setEditingEmployeeData] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const defaultNewEmployee = {
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    isAdmin: false,
    password: "",
    locationId: "",
    photoUrl: "",
    contractType: "full-time",
    restDay: "0",
    restStartTime: "00:00",
    restEndTime: "00:00",
    weeklyHours: 40,
    autoClockIn: true
  }

  const handleEditClick = (emp: any) => {
    setEditingEmployeeData(null);
    setIsEditOpen(false);
    
    setTimeout(() => {
      setEditingEmployeeData({ ...emp, isAdmin: emp.role === 'admin' });
      setIsEditOpen(true);
    }, 100);
  }

  const handleAddEmployee = (data: any) => {
    if (!data.firstName || !data.lastName || !data.email || !data.password || !data.jobTitle) {
      toast({ variant: "destructive", title: "Campi Mancanti", description: "Compila tutti i campi obbligatori, inclusa la Qualifica." })
      return
    }

    const tempId = `emp-${Date.now()}`
    const selectedLoc = locations?.find(l => l.id === data.locationId)
    const employeeRef = doc(db, "employees", tempId)

    const employeeData = {
      id: tempId,
      ...data,
      email: (data.email || "").trim().toLowerCase(),
      role: data.isAdmin ? 'admin' : 'employee',
      locationName: selectedLoc?.name || "Nessuna",
      isActive: true,
      hireDate: new Date().toISOString(),
      companyId: "default",
      photoUrl: data.photoUrl || "",
      autoClockIn: data.autoClockIn ?? true
    }

    setDocumentNonBlocking(employeeRef, employeeData, { merge: true })
    setIsAddDialogOpen(false)
    toast({ title: "Dipendente Aggiunto", description: `${employeeData.firstName} è stato inserito nel sistema.` })
  }

  const handleUpdateEmployee = (data: any) => {
    if (!data) return
    const selectedLoc = locations?.find(l => l.id === data.locationId)
    const employeeRef = doc(db, "employees", data.id)

    const updateData = {
      ...data,
      role: data.isAdmin ? 'admin' : 'employee',
      locationName: selectedLoc?.name || "Nessuna",
      email: (data.email || "").trim().toLowerCase(),
    }

    updateDocumentNonBlocking(employeeRef, updateData)
    setIsEditOpen(false)
    setEditingEmployeeData(null)
    toast({ title: "Profilo Aggiornato", description: "Le modifiche sono state salvate correttamente." })
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    const q = searchQuery.toLowerCase()
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q)
    )
  }, [employees, searchQuery])

  const handleDelete = (id: string) => {
    const employeeRef = doc(db, "employees", id)
    deleteDocumentNonBlocking(employeeRef)
    toast({ title: "Eliminato", description: "Il collaboratore è stato rimosso." })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- REFINED HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Gestione Risorse
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter">Anagrafica Team</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <User className="h-3 w-3" /> 
            {filteredEmployees.length} collaboratori registrati
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-12 px-8 rounded-2xl shadow-lg shadow-blue-500/20 text-[10px] uppercase tracking-widest">
          <Plus className="h-4 w-4 mr-2" /> Nuovo Collaboratore
        </Button>
      </div>

      {/* --- NEW FILTER BAR --- */}
      <div className="bg-[#1e293b] p-3 rounded-3xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-[#227FD8]" />
            <Input 
              placeholder="Cerca per nome, cognome o email..." 
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

      {/* --- EMPLOYEES GRID --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employeesLoading ? (
          <div className="col-span-full py-24 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Caricamento team...</p>
          </div>
        ) : filteredEmployees.length > 0 ? filteredEmployees.map((emp) => (
          <div key={emp.id} className="group relative bg-white rounded-[2rem] p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-xl hover:ring-[#227FD8]/30 transition-all duration-500 overflow-hidden">
            {/* Soft Glow Background */}
            <div className={cn(
              "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.07]",
              emp.role === 'admin' ? "bg-[#227FD8]" : "bg-slate-400"
            )} />

            <div className="relative z-10 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-slate-100">
                    <AvatarImage src={emp.photoUrl} />
                    <AvatarFallback className="bg-[#1e293b] text-white font-black text-sm">{(emp.firstName || "U").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-base text-[#1e293b] truncate leading-none">
                        {emp.firstName} {emp.lastName}
                      </p>
                      {emp.role === 'admin' && <ShieldCheck className="h-4 w-4 text-[#227FD8]" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">{emp.jobTitle}</span>
                  </div>
                </div>
                {emp.autoClockIn !== false && (
                  <div className="bg-amber-50 h-8 w-8 rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100/50">
                    <Zap className="h-4 w-4 fill-current" />
                  </div>
                )}
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-3.5 w-3.5 text-[#227FD8]" />
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.1em]">{emp.locationName || "Tutte le Sedi"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{emp.contractType} ({emp.weeklyHours}h)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Riposo: {DAYS_OF_WEEK.find(d => d.value === emp.restDay)?.label || "N/D"}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 rounded-xl h-10 font-black text-[9px] uppercase tracking-widest border-slate-200 hover:bg-[#1e293b] hover:text-white transition-all shadow-sm"
                  onClick={() => handleEditClick(emp)}
                >
                  <Edit className="h-3.5 w-3.5 mr-2" /> Modifica
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-xl h-10 w-10 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 w-48">
                    <DropdownMenuItem 
                      className="text-rose-600 font-black text-[10px] uppercase tracking-widest cursor-pointer py-3 rounded-xl focus:bg-rose-50"
                      onSelect={() => handleDelete(emp.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Elimina Profilo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="h-20 w-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg border border-slate-100 mb-6 group hover:rotate-12 transition-transform">
              <User className="h-10 w-10 text-slate-200 group-hover:text-[#227FD8]" />
            </div>
            <h3 className="text-xl font-black text-[#1e293b] tracking-tight">Nessun collaboratore trovato</h3>
            <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">
              Non ci sono profili che corrispondono ai filtri attuali.
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

      {/* --- ADD MODAL --- */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          <EmployeeForm 
            initialData={defaultNewEmployee}
            onSubmit={handleAddEmployee}
            onCancel={() => setIsAddDialogOpen(false)}
            locations={locations || []}
            title="Nuovo Collaboratore"
            submitLabel="SALVA DIPENDENTE"
          />
        </DialogContent>
      </Dialog>

      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingEmployeeData(null);
      }}>
        <DialogContent className="sm:max-w-[750px] p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          {editingEmployeeData && (
            <EmployeeForm 
              initialData={editingEmployeeData}
              onSubmit={handleUpdateEmployee}
              onCancel={() => {
                setIsEditOpen(false);
                setEditingEmployeeData(null);
              }}
              locations={locations || []}
              title="Modifica Collaboratore"
              submitLabel="SALVA MODIFICHE"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
