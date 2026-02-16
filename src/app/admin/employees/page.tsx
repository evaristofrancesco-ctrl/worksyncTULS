
"use client"

import { useState, useMemo } from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  MapPin, 
  Trash2, 
  Loader2, 
  Edit, 
  ImageIcon, 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  User, 
  Briefcase,
  Lock,
  Mail
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [newEmployee, setNewEmployee] = useState({
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
    weeklyHours: 46,
  })

  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  const handleContractChange = (type: string, target: 'new' | 'edit') => {
    const hours = type === 'full-time' ? 46 : 23
    if (target === 'new') {
      setNewEmployee({ ...newEmployee, contractType: type, weeklyHours: hours })
    } else {
      setEditingEmployee({ ...editingEmployee, contractType: type, weeklyHours: hours })
    }
  }

  const handleAddEmployee = () => {
    if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.email || !newEmployee.password) {
      toast({
        variant: "destructive",
        title: "Campi Mancanti",
        description: "Compila tutti i campi obbligatori nel Tab Dati Personali.",
      })
      return
    }

    const tempId = `emp-${Date.now()}`
    const selectedLoc = locations?.find(l => l.id === newEmployee.locationId)
    const employeeRef = doc(db, "employees", tempId)

    const employeeData = {
      id: tempId,
      ...newEmployee,
      email: (newEmployee.email || "").trim().toLowerCase(),
      role: newEmployee.isAdmin ? 'admin' : 'employee',
      locationName: selectedLoc?.name || "Nessuna",
      isActive: true,
      hireDate: new Date().toISOString(),
      companyId: "default",
      photoUrl: newEmployee.photoUrl || `https://picsum.photos/seed/${tempId}/200/200`
    }

    setDocumentNonBlocking(employeeRef, employeeData, { merge: true })
    setIsAddDialogOpen(false)
    toast({ title: "Dipendente Aggiunto", description: `${employeeData.firstName} è ora nel sistema.` })
  }

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return
    const selectedLoc = locations?.find(l => l.id === editingEmployee.locationId)
    const employeeRef = doc(db, "employees", editingEmployee.id)

    const updateData = {
      ...editingEmployee,
      role: editingEmployee.isAdmin ? 'admin' : 'employee',
      locationName: selectedLoc?.name || "Nessuna",
      email: (editingEmployee.email || "").trim().toLowerCase(),
    }

    updateDocumentNonBlocking(employeeRef, updateData)
    setIsEditDialogOpen(false)
    toast({ title: "Profilo Aggiornato", description: "Le modifiche sono state salvate." })
  }

  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [employees, searchQuery])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Gestione Dipendenti TU.L.S.</h1>
          <p className="text-muted-foreground">Organizza il tuo team, gestisci contratti e orari di riposo.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 h-11 px-6 shadow-md font-bold">
              <Plus className="h-5 w-5" /> Aggiungi Collaboratore
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-[#227FD8] p-6 text-white">
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <UserPlus className="h-6 w-6" /> Nuova Scheda Dipendente
              </DialogTitle>
              <DialogDescription className="text-blue-100">Configurazione centralizzata del profilo e del contratto.</DialogDescription>
            </div>
            
            <Tabs defaultValue="personali" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/20 p-1 rounded-none border-b">
                <TabsTrigger value="personali" className="font-black gap-2 data-[state=active]:bg-white data-[state=active]:text-[#227FD8]"><User className="h-4 w-4" /> DATI PERSONALI</TabsTrigger>
                <TabsTrigger value="lavoro" className="font-black gap-2 data-[state=active]:bg-white data-[state=active]:text-[#227FD8]"><Briefcase className="h-4 w-4" /> LAVORO</TabsTrigger>
              </TabsList>

              <TabsContent value="personali" className="p-6 space-y-4 animate-in slide-in-from-left-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome *</Label>
                    <Input placeholder="es. Mario" value={newEmployee.firstName} onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Cognome *</Label>
                    <Input placeholder="es. Rossi" value={newEmployee.lastName} onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Email di Accesso *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" placeholder="mario.rossi@tulas.it" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Password di Accesso *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" className="pl-10" placeholder="••••••••" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">URL Foto Profilo</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="https://..." value={newEmployee.photoUrl} onChange={e => setNewEmployee({...newEmployee, photoUrl: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#227FD8]/5 rounded-xl border border-[#227FD8]/10 mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold text-[#1e293b]">Privilegi Amministratore</Label>
                    <p className="text-xs text-muted-foreground">Consenti l'accesso alla dashboard gestionale completa.</p>
                  </div>
                  <Switch checked={newEmployee.isAdmin} onCheckedChange={v => setNewEmployee({...newEmployee, isAdmin: v})} />
                </div>
              </TabsContent>

              <TabsContent value="lavoro" className="p-6 space-y-4 animate-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Reparto</Label>
                    <Input placeholder="es. Vendite" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Posizione / Ruolo</Label>
                    <Input placeholder="es. Store Manager" value={newEmployee.jobTitle} onChange={e => setNewEmployee({...newEmployee, jobTitle: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Sede Operativa</Label>
                    <Select value={newEmployee.locationId} onValueChange={v => setNewEmployee({...newEmployee, locationId: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Tipo Contratto</Label>
                    <Select value={newEmployee.contractType} onValueChange={v => handleContractChange(v, 'new')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (46h)</SelectItem>
                        <SelectItem value="part-time">Part-time (23h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Giorno di Riposo</Label>
                    <Select value={newEmployee.restDay} onValueChange={v => setNewEmployee({...newEmployee, restDay: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Ore Settimanali</Label>
                    <Input type="number" value={newEmployee.weeklyHours} onChange={e => setNewEmployee({...newEmployee, weeklyHours: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-amber-700">Inizio Riposo Orario</Label>
                    <Input type="time" value={newEmployee.restStartTime} onChange={e => setNewEmployee({...newEmployee, restStartTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-amber-700">Fine Riposo Orario</Label>
                    <Input type="time" value={newEmployee.restEndTime} onChange={e => setNewEmployee({...newEmployee, restEndTime: e.target.value})} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-6 bg-muted/10 border-t">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleAddEmployee} className="bg-[#227FD8] h-12 px-10 font-black shadow-lg">SALVA DIPENDENTE</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-[#1e293b]">Database Collaboratori</CardTitle>
              <CardDescription>Gestione completa dei ruoli, accessi e contratti.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                className="pl-9 bg-muted/40 border-none h-10 focus-visible:ring-[#227FD8]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-black">Collaboratore</TableHead>
                <TableHead className="font-black">Ruolo / Sede</TableHead>
                <TableHead className="font-black">Contratto</TableHead>
                <TableHead className="font-black">Riposo</TableHead>
                <TableHead className="text-right font-black pr-6">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
              ) : filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border-2 border-white shadow-sm">
                        <AvatarImage src={emp.photoUrl} />
                        <AvatarFallback className="font-black">{emp.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold text-[#1e293b]">
                          {emp.firstName} {emp.lastName}
                          {emp.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-[#227FD8]" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{emp.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{emp.jobTitle}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{emp.locationName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px] border-[#227FD8]/20 text-[#227FD8] font-bold">
                      {emp.contractType} ({emp.weeklyHours}h)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#1e293b]">{DAYS_OF_WEEK.find(d => d.value === emp.restDay)?.label}</span>
                      {emp.restStartTime !== "00:00" && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit border border-amber-100">
                          {emp.restStartTime} - {emp.restEndTime}
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
                        <DropdownMenuItem onClick={() => { setEditingEmployee({...emp, isAdmin: emp.role === 'admin'}); setIsEditDialogOpen(true) }} className="font-bold"><Edit className="h-4 w-4 mr-2" /> Modifica</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => { if(confirm("Sei sicuro?")) deleteDocumentNonBlocking(doc(db, "employees", emp.id)) }}><Trash2 className="h-4 w-4 mr-2" /> Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesLoading && filteredEmployees.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic">Nessun collaboratore trovato.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Modifica (Ripristinato con Tab) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-[#227FD8] p-6 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Edit className="h-6 w-6" /> Modifica Scheda Dipendente
            </DialogTitle>
          </div>
          {editingEmployee && (
            <Tabs defaultValue="personali" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/20 p-1 rounded-none border-b">
                <TabsTrigger value="personali" className="font-black gap-2"><User className="h-4 w-4" /> DATI PERSONALI</TabsTrigger>
                <TabsTrigger value="lavoro" className="font-black gap-2"><Briefcase className="h-4 w-4" /> LAVORO</TabsTrigger>
              </TabsList>
              <TabsContent value="personali" className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome</Label>
                    <Input value={editingEmployee.firstName} onChange={e => setEditingEmployee({...editingEmployee, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Cognome</Label>
                    <Input value={editingEmployee.lastName} onChange={e => setEditingEmployee({...editingEmployee, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Email di Accesso</Label>
                  <Input value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Password (lascia vuoto per non cambiare)</Label>
                    <Input type="password" value={editingEmployee.password} onChange={e => setEditingEmployee({...editingEmployee, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">URL Foto</Label>
                    <Input value={editingEmployee.photoUrl} onChange={e => setEditingEmployee({...editingEmployee, photoUrl: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl mt-4">
                  <Label className="font-bold">Privilegi Amministratore</Label>
                  <Switch checked={editingEmployee.isAdmin} onCheckedChange={v => setEditingEmployee({...editingEmployee, isAdmin: v})} />
                </div>
              </TabsContent>
              <TabsContent value="lavoro" className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Sede Operativa</Label>
                    <Select value={editingEmployee.locationId} onValueChange={v => setEditingEmployee({...editingEmployee, locationId: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Tipo Contratto</Label>
                    <Select value={editingEmployee.contractType} onValueChange={v => handleContractChange(v, 'edit')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (46h)</SelectItem>
                        <SelectItem value="part-time">Part-time (23h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Giorno di Riposo</Label>
                    <Select value={editingEmployee.restDay} onValueChange={v => setEditingEmployee({...editingEmployee, restDay: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Ore Settimanali</Label>
                    <Input type="number" value={editingEmployee.weeklyHours} onChange={e => setEditingEmployee({...editingEmployee, weeklyHours: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-amber-700">Inizio Riposo Orario</Label>
                    <Input type="time" value={editingEmployee.restStartTime} onChange={e => setEditingEmployee({...editingEmployee, restStartTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-amber-700">Fine Riposo Orario</Label>
                    <Input type="time" value={editingEmployee.restEndTime} onChange={e => setEditingEmployee({...editingEmployee, restEndTime: e.target.value})} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="p-6 bg-muted/10 border-t">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleUpdateEmployee} className="bg-[#227FD8] h-12 px-10 font-black shadow-lg">SALVA MODIFICHE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
