
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
  Clock
} from "lucide-react"
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
      <DialogHeader className="bg-[#227FD8] p-6 text-white rounded-t-lg">
        <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase">
          {submitLabel === 'SALVA MODIFICHE' ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />} {title}
        </DialogTitle>
        <DialogDescription className="text-blue-50 text-sm">Configurazione completa del profilo collaboratore.</DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="personali" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 p-1 rounded-none border-b">
          <TabsTrigger value="personali" className="font-bold text-sm gap-2"><User className="h-4 w-4" /> DATI PERSONALI</TabsTrigger>
          <TabsTrigger value="lavoro" className="font-bold text-sm gap-2"><Briefcase className="h-4 w-4" /> IMPOSTAZIONI LAVORO</TabsTrigger>
        </TabsList>

        <TabsContent value="personali" className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Nome *</Label>
              <Input className="h-11 text-base" placeholder="es. Mario" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Cognome *</Label>
              <Input className="h-11 text-base" placeholder="es. Rossi" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-sm uppercase text-slate-500">Email di Accesso *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input className="pl-10 h-11 text-base" placeholder="mario.rossi@tulas.it" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input type="password" dir="ltr" className="pl-10 h-11 text-base" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">URL Foto</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input className="pl-10 h-11 text-base" placeholder="https://..." value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <Label className="text-base font-bold text-slate-900">Privilegi Amministratore</Label>
              <p className="text-sm text-slate-500">Consente l'accesso alla dashboard gestionale completa.</p>
            </div>
            <Switch checked={formData.isAdmin} onCheckedChange={v => setFormData({...formData, isAdmin: v})} />
          </div>
        </TabsContent>

        <TabsContent value="lavoro" className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Sede Operativa</Label>
              <Select value={formData.locationId} onValueChange={v => setFormData({...formData, locationId: v})}>
                <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Contratto</Label>
              <Select value={formData.contractType} onValueChange={handleContractChange}>
                <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time (40h)</SelectItem>
                  <SelectItem value="part-time">Part-time (20h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Giorno di Riposo</Label>
              <Select value={formData.restDay} onValueChange={v => setFormData({...formData, restDay: v})}>
                <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Inizio Riposo Orario</Label>
              <Input type="time" className="h-11 text-base" value={formData.restStartTime} onChange={e => setFormData({...formData, restStartTime: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Ore Settimanali</Label>
              <Input className="h-11 text-base" type="number" value={formData.weeklyHours} onChange={e => setFormData({...formData, weeklyHours: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm uppercase text-slate-500">Fine Riposo Orario</Label>
              <Input type="time" className="h-11 text-base" value={formData.restEndTime} onChange={e => setFormData({...formData, restEndTime: e.target.value})} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-amber-500 fill-current" />
              <div className="space-y-1">
                <Label className="text-base font-bold text-slate-900">Timbratura Automatica</Label>
                <p className="text-sm text-slate-500">Includi dipendente nella generazione log giornaliera.</p>
              </div>
            </div>
            <Switch checked={formData.autoClockIn} onCheckedChange={v => setFormData({...formData, autoClockIn: v})} />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="p-6 bg-slate-50 border-t rounded-b-lg">
        <Button variant="ghost" onClick={onCancel} className="font-bold uppercase text-sm">Annulla</Button>
        <Button onClick={() => onSubmit(formData)} className="bg-[#227FD8] hover:bg-[#227FD8]/90 px-10 font-bold shadow-md uppercase text-sm">
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
    department: "",
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

  // Risoluzione freeze: apertura asincrona tramite effetto dedicato
  useEffect(() => {
    if (editingEmployeeData && !isEditOpen) {
      const timer = setTimeout(() => setIsEditOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [editingEmployeeData, isEditOpen]);

  const handleEditClick = (emp: any) => {
    // Interrompiamo il focus del menu prima di settare i dati
    setIsEditOpen(false);
    setEditingEmployeeData({ ...emp, isAdmin: emp.role === 'admin' });
  }

  const handleAddEmployee = (data: any) => {
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      toast({ variant: "destructive", title: "Campi Mancanti", description: "Compila tutti i campi obbligatori." })
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
      photoUrl: data.photoUrl || `https://picsum.photos/seed/${tempId}/200/200`,
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestione Team</h1>
          <p className="text-lg text-slate-500">Anagrafica completa e configurazione accessi dei collaboratori.</p>
        </div>
        
        <Button 
          onClick={() => setIsAddDialogOpen(true)} 
          className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 font-bold uppercase h-12 px-8 shadow-lg"
        >
          <Plus className="h-6 w-6" /> Aggiungi Collaboratore
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="py-6 px-8 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-wider">Elenco Dipendenti</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca per nome o email..."
                className="pl-10 bg-slate-50 border-slate-200 h-11 text-base"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-14">
                <TableHead className="text-sm font-bold uppercase pl-8 text-slate-500">Collaboratore</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500">Ruolo / Sede</TableHead>
                <TableHead className="text-sm font-bold uppercase text-center text-slate-500">Contratto</TableHead>
                <TableHead className="text-sm font-bold uppercase text-slate-500">Riposo</TableHead>
                <TableHead className="text-right text-sm font-bold uppercase pr-8 text-slate-500">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={5} className="py-24 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
              ) : filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors h-20">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={emp.photoUrl} />
                        <AvatarFallback className="font-bold text-base bg-slate-100">{emp.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                          {emp.firstName} {emp.lastName}
                          {emp.role === 'admin' && <ShieldCheck className="h-5 w-5 text-[#227FD8]" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                           {emp.email}
                           {emp.autoClockIn !== false && <Zap className="h-4 w-4 text-amber-500 fill-current" />}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-slate-800">{emp.jobTitle}</span>
                      <span className="text-xs text-slate-400 font-black uppercase tracking-widest">{emp.locationName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs border-blue-200 text-[#227FD8] bg-blue-50 font-black px-4 py-1 uppercase tracking-tighter">
                      {emp.contractType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{DAYS_OF_WEEK.find(d => d.value === emp.restDay)?.label}</span>
                      {emp.restStartTime && emp.restStartTime !== "00:00" && (
                        <span className="text-xs text-amber-600 font-black flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {emp.restStartTime}-{emp.restEndTime}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-200"><MoreVertical className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem 
                          onSelect={(e) => {
                            e.preventDefault(); // Fondamentale per evitare il freeze del focus
                            handleEditClick(emp);
                          }}
                          className="font-bold cursor-pointer py-3 text-sm"
                        >
                          <Edit className="h-4 w-4 mr-3" /> Modifica Profilo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive font-bold cursor-pointer py-3 text-sm" 
                          onSelect={(e) => {
                            e.preventDefault();
                            handleDelete(emp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-3" /> Elimina Collaboratore
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesLoading && filteredEmployees.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-32 text-center text-slate-400 font-bold italic">Nessun collaboratore trovato nel sistema.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Nuova Scheda */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 border-none shadow-2xl overflow-hidden rounded-lg">
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

      {/* Dialog Modifica Scheda */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingEmployeeData(null);
      }}>
        <DialogContent className="sm:max-w-[700px] p-0 border-none shadow-2xl overflow-hidden rounded-lg">
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
