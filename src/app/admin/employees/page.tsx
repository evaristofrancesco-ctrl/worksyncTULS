
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
  Zap
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
  DialogTrigger,
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
    autoClockIn: initialData.autoClockIn ?? true
  })

  const handleContractChange = (type: string) => {
    const hours = type === 'full-time' ? 40 : 20
    setFormData({ ...formData, contractType: type, weeklyHours: hours })
  }

  return (
    <div className="flex flex-col">
      <DialogHeader className="bg-[#227FD8] p-6 text-white space-y-1">
        <DialogTitle className="text-xl font-black flex items-center gap-2 uppercase">
          {submitLabel === 'SALVA MODIFICHE' ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />} {title}
        </DialogTitle>
        <DialogDescription className="text-blue-100 text-sm">Configurazione profilazione e impostazioni timbratura.</DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="personali" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/20 p-1 rounded-none border-b">
          <TabsTrigger value="personali" className="font-black text-xs gap-2"><User className="h-4 w-4" /> DATI PERSONALI</TabsTrigger>
          <TabsTrigger value="lavoro" className="font-black text-xs gap-2"><Briefcase className="h-4 w-4" /> LAVORO</TabsTrigger>
        </TabsList>

        <TabsContent value="personali" className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Nome *</Label>
              <Input className="h-10 text-sm" placeholder="es. Mario" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Cognome *</Label>
              <Input className="h-10 text-sm" placeholder="es. Rossi" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="font-bold text-xs uppercase text-muted-foreground">Email di Accesso *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10 h-10 text-sm" placeholder="mario.rossi@tulas.it" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" dir="ltr" className="pl-10 h-10 text-sm" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">URL Foto</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10 h-10 text-sm" placeholder="https://..." value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#227FD8]/5 rounded-xl border border-[#227FD8]/10 mt-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-[#1e293b]">Privilegi Amministratore</Label>
              <p className="text-xs text-muted-foreground">Accesso alla dashboard gestionale completa.</p>
            </div>
            <Switch checked={formData.isAdmin} onCheckedChange={v => setFormData({...formData, isAdmin: v})} />
          </div>
        </TabsContent>

        <TabsContent value="lavoro" className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Reparto</Label>
              <Input className="h-10 text-sm" placeholder="es. Vendite" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Ruolo</Label>
              <Input className="h-10 text-sm" placeholder="es. Store Manager" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Sede Operativa</Label>
              <Select value={formData.locationId} onValueChange={v => setFormData({...formData, locationId: v})}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Contratto</Label>
              <Select value={formData.contractType} onValueChange={handleContractChange}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time (40h)</SelectItem>
                  <SelectItem value="part-time">Part-time (20h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Giorno Riposo</Label>
              <Select value={formData.restDay} onValueChange={v => setFormData({...formData, restDay: v})}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-xs uppercase text-muted-foreground">Ore Settimanali</Label>
              <Input className="h-10 text-sm" type="number" value={formData.weeklyHours} onChange={e => setFormData({...formData, weeklyHours: Number(e.target.value)})} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 mt-2">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500 fill-current" />
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-[#1e293b]">Timbratura Automatica</Label>
                <p className="text-xs text-muted-foreground">Generazione automatica log mattino/pomeriggio.</p>
              </div>
            </div>
            <Switch checked={formData.autoClockIn} onCheckedChange={v => setFormData({...formData, autoClockIn: v})} />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="p-6 bg-muted/10 border-t">
        <Button variant="ghost" onClick={onCancel} className="font-bold uppercase h-11">Annulla</Button>
        <Button onClick={() => onSubmit(formData)} className="bg-[#227FD8] h-11 px-8 font-black shadow-md uppercase tracking-wider">{submitLabel}</Button>
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
    toast({ title: "Dipendente Aggiunto", description: `${employeeData.firstName} è ora nel sistema.` })
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
    toast({ title: "Profilo Aggiornato", description: "Le modifiche sono state salvate con successo." })
  }

  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    const q = searchQuery.toLowerCase()
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q)
    )
  }, [employees, searchQuery])

  const handleEditClick = (emp: any) => {
    // Disaccoppiamento asincrono migliorato per prevenire il freeze di Radix UI
    setEditingEmployeeData({ ...emp, isAdmin: emp.role === 'admin' })
    setTimeout(() => {
      setIsEditOpen(true)
    }, 150);
  }

  const handleDelete = (id: string) => {
    const employeeRef = doc(db, "employees", id)
    deleteDocumentNonBlocking(employeeRef)
    toast({ title: "Eliminato", description: "Il collaboratore è stato rimosso correttamente." })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">Database collaboratori e configurazione accessi.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 font-bold uppercase h-12 px-6 shadow-lg">
              <Plus className="h-5 w-5" /> Aggiungi Collaboratore
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none shadow-2xl">
            <EmployeeForm 
              initialData={defaultNewEmployee}
              onSubmit={handleAddEmployee}
              onCancel={() => setIsAddDialogOpen(false)}
              locations={locations || []}
              title="Nuova Scheda"
              submitLabel="SALVA DIPENDENTE"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 overflow-hidden">
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base font-black text-[#1e293b] uppercase tracking-wider">Elenco Team</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                className="pl-10 bg-muted/30 border-none h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-12">
                <TableHead className="text-xs font-black uppercase pl-6">Collaboratore</TableHead>
                <TableHead className="text-xs font-black uppercase">Ruolo / Sede</TableHead>
                <TableHead className="text-xs font-black uppercase text-center">Contratto</TableHead>
                <TableHead className="text-xs font-black uppercase">Riposo</TableHead>
                <TableHead className="text-right text-xs font-black uppercase pr-6">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
              ) : filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/10 transition-colors h-14">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage src={emp.photoUrl} />
                        <AvatarFallback className="font-bold text-xs">{emp.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold text-[#1e293b] text-sm">
                          {emp.firstName} {emp.lastName}
                          {emp.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-[#227FD8]" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                           {emp.email}
                           {emp.autoClockIn !== false && <Zap className="h-3 w-3 text-amber-500 fill-current" />}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-bold text-[#1e293b]">{emp.jobTitle}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-tight">{emp.locationName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs border-[#227FD8]/30 text-[#227FD8] font-black px-3 py-1">
                      {emp.contractType?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-bold text-[#1e293b]">{DAYS_OF_WEEK.find(d => d.value === emp.restDay)?.label}</span>
                      {emp.restStartTime && emp.restStartTime !== "00:00" && (
                        <span className="text-xs text-amber-600 font-bold">
                          {emp.restStartTime}-{emp.restEndTime}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onSelect={(e) => {
                            e.preventDefault();
                            handleEditClick(emp);
                          }}
                          className="text-sm font-bold cursor-pointer py-2"
                        >
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-sm text-destructive font-bold cursor-pointer py-2" 
                          onSelect={(e) => {
                            e.preventDefault();
                            handleDelete(emp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesLoading && filteredEmployees.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-20 text-center text-sm text-muted-foreground italic font-medium">Nessun collaboratore trovato nel database.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog 
        open={isEditOpen} 
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingEmployeeData(null);
        }}
      >
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none shadow-2xl">
          {editingEmployeeData && (
            <EmployeeForm 
              key={editingEmployeeData.id}
              initialData={editingEmployeeData}
              onSubmit={handleUpdateEmployee}
              onCancel={() => {
                setIsEditOpen(false);
                setEditingEmployeeData(null);
              }}
              locations={locations || []}
              title="Modifica Scheda"
              submitLabel="SALVA MODIFICHE"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
