
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
  Lock
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
  const { toast } = useToast()

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
    restStartTime: "",
    restEndTime: "",
    weeklyHours: 44,
  })

  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  const handleContractChange = (type: string, target: 'new' | 'edit') => {
    const hours = type === 'full-time' ? 44 : 22
    if (target === 'new') {
      setNewEmployee({ ...newEmployee, contractType: type, weeklyHours: hours })
    } else {
      setEditingEmployee({ ...editingEmployee, contractType: type, weeklyHours: hours })
    }
  }

  const handleAddEmployee = () => {
    const cleanEmail = (newEmployee.email || "").trim().toLowerCase()
    const cleanPassword = (newEmployee.password || "").trim()

    if (!newEmployee.firstName || !newEmployee.lastName || !cleanEmail || !newEmployee.jobTitle || !cleanPassword) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Per favore compila i campi obbligatori nella scheda Dati Personali.",
      })
      return
    }

    const tempId = `emp-${Date.now()}`
    const selectedLoc = locations?.find(l => l.id === newEmployee.locationId)
    const employeeRef = doc(db, "employees", tempId)

    const employeeData = {
      id: tempId,
      firstName: (newEmployee.firstName || "").trim(),
      lastName: (newEmployee.lastName || "").trim(),
      email: cleanEmail,
      password: cleanPassword,
      role: newEmployee.isAdmin ? 'admin' : 'employee',
      jobTitle: (newEmployee.jobTitle || "").trim(),
      department: (newEmployee.department || "").trim() || "Generale",
      isActive: true,
      hireDate: new Date().toISOString(),
      companyId: "default",
      locationId: newEmployee.locationId || "",
      locationName: selectedLoc?.name || "Nessuna",
      contractType: newEmployee.contractType || "full-time",
      restDay: newEmployee.restDay || "0",
      restStartTime: newEmployee.restStartTime || "",
      restEndTime: newEmployee.restEndTime || "",
      weeklyHours: Number(newEmployee.weeklyHours) || 0,
      photoUrl: newEmployee.photoUrl || `https://picsum.photos/seed/${tempId}/200/200`
    }

    setDocumentNonBlocking(employeeRef, employeeData, { merge: true })

    setIsAddDialogOpen(false)
    setNewEmployee({ 
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
      restStartTime: "",
      restEndTime: "",
      weeklyHours: 44
    })
    
    toast({
      title: "Successo!",
      description: `${employeeData.firstName} ${employeeData.lastName} è stato aggiunto.`,
    })
  }

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return;

    const selectedLoc = locations?.find(l => l.id === editingEmployee.locationId)
    const employeeRef = doc(db, "employees", editingEmployee.id)

    const updateData = {
      ...editingEmployee,
      firstName: (editingEmployee.firstName || "").trim(),
      lastName: (editingEmployee.lastName || "").trim(),
      email: (editingEmployee.email || "").trim().toLowerCase(),
      jobTitle: (editingEmployee.jobTitle || "").trim(),
      department: (editingEmployee.department || "").trim() || "Generale",
      locationName: selectedLoc?.name || "Nessuna",
      role: editingEmployee.isAdmin ? 'admin' : 'employee',
      weeklyHours: Number(editingEmployee.weeklyHours) || 0,
      photoUrl: editingEmployee.photoUrl || `https://picsum.photos/seed/${editingEmployee.id}/200/200`
    }

    updateDocumentNonBlocking(employeeRef, updateData)

    setIsEditDialogOpen(false)
    setEditingEmployee(null)
    
    toast({
      title: "Profilo aggiornato",
      description: "Le modifiche sono state salvate correttamente.",
    })
  }

  const handleDeleteEmployee = (id: string) => {
    const employeeRef = doc(db, "employees", id)
    deleteDocumentNonBlocking(employeeRef)
    toast({
      title: "Dipendente rimosso",
      description: "Il profilo è stato rimosso con successo.",
    })
  }

  const openEditDialog = (employee: any) => {
    setEditingEmployee({
      ...employee,
      isAdmin: employee.role === 'admin'
    })
    setIsEditDialogOpen(true)
  }

  const filteredEmployees = useMemo(() => {
    return employees?.filter(emp => {
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const search = searchQuery.toLowerCase();
      return fullName.includes(search) ||
        (emp.email || "").toLowerCase().includes(search) ||
        (emp.jobTitle || "").toLowerCase().includes(search);
    }) || []
  }, [employees, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">Anagrafica centralizzata, contratti e pianificazione oraria.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90 h-11 px-6 shadow-md font-bold">
              <Plus className="h-5 w-5" />
              Aggiungi Dipendente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#1e293b]">
                <UserPlus className="h-6 w-6 text-[#227FD8]" />
                Nuova Scheda Dipendente
              </DialogTitle>
              <DialogDescription>
                Configura i dati personali e i parametri lavorativi del nuovo collaboratore.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="personali" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1">
                <TabsTrigger value="personali" className="font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="h-4 w-4" /> Dati Personali
                </TabsTrigger>
                <TabsTrigger value="lavoro" className="font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Briefcase className="h-4 w-4" /> Lavoro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personali" className="space-y-6 py-6 animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl border border-dashed">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                    <AvatarImage src={newEmployee.photoUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary"><ImageIcon className="h-8 w-8" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="photoUrl" className="font-bold text-[#1e293b]">Foto Profilo (URL)</Label>
                    <Input 
                      id="photoUrl" 
                      placeholder="https://images.unsplash.com/..." 
                      value={newEmployee.photoUrl}
                      onChange={(e) => setNewEmployee({...newEmployee, photoUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-bold">Nome *</Label>
                    <Input id="firstName" value={newEmployee.firstName} onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold">Cognome *</Label>
                    <Input id="lastName" value={newEmployee.lastName} onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Email di Accesso *</Label>
                    <Input id="email" type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-bold">Password di Accesso *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type="password" className="pl-10" value={newEmployee.password} onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Privilegi Amministratore</Label>
                    <p className="text-xs text-muted-foreground">Consenti l'accesso alla dashboard di gestione.</p>
                  </div>
                  <Switch 
                    checked={newEmployee.isAdmin} 
                    onCheckedChange={(v) => setNewEmployee({...newEmployee, isAdmin: v})} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="lavoro" className="space-y-6 py-6 animate-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Posizione / Ruolo *</Label>
                    <Input placeholder="es. Sales Manager" value={newEmployee.jobTitle} onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Reparto</Label>
                    <Input placeholder="es. Vendite" value={newEmployee.department} onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Sede Operativa</Label>
                    <Select value={newEmployee.locationId || "none"} onValueChange={(v) => setNewEmployee({...newEmployee, locationId: v === "none" ? "" : v})}>
                      <SelectTrigger><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna Sede</SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Tipo Contratto</Label>
                    <Select value={newEmployee.contractType} onValueChange={(v) => handleContractChange(v, 'new')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (44h)</SelectItem>
                        <SelectItem value="part-time">Part-time (22h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Ore Settimanali</Label>
                    <Input type="number" value={newEmployee.weeklyHours} onChange={(e) => setNewEmployee({...newEmployee, weeklyHours: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Giorno di Riposo</Label>
                    <Select value={newEmployee.restDay} onValueChange={(v) => setNewEmployee({...newEmployee, restDay: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Inizio Riposo Orario</Label>
                    <Input type="time" value={newEmployee.restStartTime} onChange={(e) => setNewEmployee({...newEmployee, restStartTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Fine Riposo Orario</Label>
                    <Input type="time" value={newEmployee.restEndTime} onChange={(e) => setNewEmployee({...newEmployee, restEndTime: e.target.value})} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6 border-t pt-6">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="font-bold">Annulla</Button>
              <Button onClick={handleAddEmployee} className="bg-[#227FD8] h-11 px-8 font-bold shadow-md">Crea Profilo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-[#1e293b]">Database Collaboratori</CardTitle>
              <CardDescription>Gestione completa dei ruoli e dei contratti aziendali.</CardDescription>
            </div>
            <div className="relative w-full max-sm-xs:w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca dipendente..."
                className="pl-9 bg-muted/40 border-none h-10 focus-visible:ring-[#227FD8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-black h-12">Dipendente</TableHead>
                <TableHead className="font-black h-12">Qualifica / Sede</TableHead>
                <TableHead className="font-black h-12">Contratto</TableHead>
                <TableHead className="font-black h-12">Riposo</TableHead>
                <TableHead className="text-right font-black h-12 pr-6">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#227FD8]" /></TableCell></TableRow>
              ) : filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={employee.photoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black">{(employee.firstName || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1e293b]">{employee.firstName} {employee.lastName}</span>
                          {employee.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-[#227FD8]" />}
                        </div>
                        <span className="text-muted-foreground text-[11px] font-medium">{employee.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#1e293b]">{employee.jobTitle}</span>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {employee.locationName || "Sede non assegnata"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="capitalize text-[10px] w-fit font-bold border-[#227FD8]/20 text-[#227FD8]">{employee.contractType}</Badge>
                      <span className="text-[10px] text-muted-foreground font-bold">{employee.weeklyHours}h settimanali</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1e293b]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#227FD8]" />
                        {DAYS_OF_WEEK.find(d => d.value === employee.restDay)?.label}
                      </div>
                      {employee.restStartTime && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded w-fit">
                          <Clock className="h-2.5 w-2.5" />
                          {employee.restStartTime}-{employee.restEndTime}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted/50"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEditDialog(employee)} className="font-bold"><Edit className="h-4 w-4 mr-2" /> Modifica</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-black" onClick={() => handleDeleteEmployee(employee.id)}><Trash2 className="h-4 w-4 mr-2" /> Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesLoading && filteredEmployees.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic">Nessun dipendente trovato.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Modifica Dipendente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#1e293b]">
              <Edit className="h-6 w-6 text-[#227FD8]" />
              Modifica Scheda Dipendente
            </DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <Tabs defaultValue="personali" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1">
                <TabsTrigger value="personali" className="font-bold gap-2">
                  <User className="h-4 w-4" /> Dati Personali
                </TabsTrigger>
                <TabsTrigger value="lavoro" className="font-bold gap-2">
                  <Briefcase className="h-4 w-4" /> Lavoro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personali" className="space-y-6 py-6 animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl border border-dashed">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                    <AvatarImage src={editingEmployee.photoUrl} />
                    <AvatarFallback>{editingEmployee.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Label className="font-bold">Foto Profilo (URL)</Label>
                    <Input value={editingEmployee.photoUrl} onChange={(e) => setEditingEmployee({...editingEmployee, photoUrl: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome</Label>
                    <Input value={editingEmployee.firstName} onChange={(e) => setEditingEmployee({...editingEmployee, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Cognome</Label>
                    <Input value={editingEmployee.lastName} onChange={(e) => setEditingEmployee({...editingEmployee, lastName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Email di Accesso</Label>
                    <Input value={editingEmployee.email} onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Password di Accesso</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="Lascia vuoto per non cambiare" className="pl-10" value={editingEmployee.password || ""} onChange={(e) => setEditingEmployee({...editingEmployee, password: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Privilegi Amministratore</Label>
                    <p className="text-xs text-muted-foreground">Stato attuale dei permessi di sistema.</p>
                  </div>
                  <Switch checked={editingEmployee.isAdmin} onCheckedChange={(v) => setEditingEmployee({...editingEmployee, isAdmin: v})} />
                </div>
              </TabsContent>

              <TabsContent value="lavoro" className="space-y-6 py-6 animate-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Posizione / Ruolo</Label>
                    <Input value={editingEmployee.jobTitle} onChange={(e) => setEditingEmployee({...editingEmployee, jobTitle: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Reparto</Label>
                    <Input value={editingEmployee.department} onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Sede Operativa</Label>
                    <Select value={editingEmployee.locationId || "none"} onValueChange={(v) => setEditingEmployee({...editingEmployee, locationId: v === "none" ? "" : v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna Sede</SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Tipo Contratto</Label>
                    <Select value={editingEmployee.contractType} onValueChange={(v) => handleContractChange(v, 'edit')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (44h)</SelectItem>
                        <SelectItem value="part-time">Part-time (22h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Ore Settimanali</Label>
                    <Input type="number" value={editingEmployee.weeklyHours} onChange={(e) => setEditingEmployee({...editingEmployee, weeklyHours: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Giorno di Riposo</Label>
                    <Select value={editingEmployee.restDay} onValueChange={(v) => setEditingEmployee({...editingEmployee, restDay: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Inizio Riposo Orario</Label>
                    <Input type="time" value={editingEmployee.restStartTime} onChange={(e) => setEditingEmployee({...editingEmployee, restStartTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Fine Riposo Orario</Label>
                    <Input type="time" value={editingEmployee.restEndTime} onChange={(e) => setEditingEmployee({...editingEmployee, restEndTime: e.target.value})} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="mt-6 border-t pt-6">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="font-bold">Annulla</Button>
            <Button onClick={handleUpdateEmployee} className="bg-[#227FD8] h-11 px-8 font-bold shadow-md">Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
