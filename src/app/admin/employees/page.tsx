
"use client"

import { useState, useMemo } from "react"
import { Plus, Search, MoreVertical, UserPlus, MapPin, Trash2, Loader2, Edit, Save, ImageIcon, CalendarDays, Clock } from "lucide-react"
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
  })

  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  const handleAddEmployee = () => {
    const cleanEmail = (newEmployee.email || "").trim().toLowerCase()
    const cleanPassword = (newEmployee.password || "").trim()

    if (!newEmployee.firstName || !newEmployee.lastName || !cleanEmail || !newEmployee.jobTitle || !cleanPassword) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Per favore compila tutti i campi obbligatori.",
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
      restEndTime: ""
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
      locationName: selectedLoc?.name || "Nessuna",
      role: editingEmployee.isAdmin ? 'admin' : 'employee',
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
          <p className="text-muted-foreground">Visualizza e gestisci l'anagrafica del tuo team con orari di riposo.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90">
              <Plus className="h-4 w-4" />
              Aggiungi Dipendente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#227FD8]" />
                Nuovo Dipendente
              </DialogTitle>
              <DialogDescription>
                Inserisci i dati del nuovo membro, inclusi orari di riposo settimanali.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identità</h4>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={newEmployee.photoUrl || ""} />
                    <AvatarFallback><ImageIcon className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="photoUrl">URL Foto Profilo</Label>
                    <Input 
                      id="photoUrl" 
                      placeholder="https://esempio.com/foto.jpg" 
                      value={newEmployee.photoUrl || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, photoUrl: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input 
                      id="firstName" 
                      placeholder="Mario" 
                      value={newEmployee.firstName || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Rossi" 
                      value={newEmployee.lastName || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contratto e Orari di Riposo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractType">Tipo Contratto</Label>
                    <Select value={newEmployee.contractType} onValueChange={(v) => setNewEmployee({...newEmployee, contractType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time (7h/giorno)</SelectItem>
                        <SelectItem value="part-time">Part-time (4h/giorno)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restDay">Giorno di Riposo</Label>
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
                
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-dashed">
                  <div className="space-y-2">
                    <Label htmlFor="restStartTime" className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Inizio Riposo Orario
                    </Label>
                    <Input 
                      id="restStartTime" 
                      type="time" 
                      value={newEmployee.restStartTime || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, restStartTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restEndTime" className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Fine Riposo Orario
                    </Label>
                    <Input 
                      id="restEndTime" 
                      type="time" 
                      value={newEmployee.restEndTime || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, restEndTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Qualifica</Label>
                    <Input 
                      id="jobTitle" 
                      placeholder="es. Senior Developer" 
                      value={newEmployee.jobTitle || ""}
                      onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Sede Operativa</Label>
                    <Select value={newEmployee.locationId || "none"} onValueChange={(v) => setNewEmployee({...newEmployee, locationId: v === "none" ? "" : v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna Sede</SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">Privilegi Amministratore</Label>
                  <Switch 
                    checked={newEmployee.isAdmin || false} 
                    onCheckedChange={(checked) => setNewEmployee({...newEmployee, isAdmin: checked})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email / Username</Label>
                    <Input id="email" value={newEmployee.email || ""} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={newEmployee.password || ""} onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleAddEmployee} className="bg-[#227FD8]">Salva Dipendente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-[#1e293b]">Anagrafica Personale</CardTitle>
              <CardDescription>Gestione dei contratti e delle fasce orarie di riposo.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca dipendente..."
                className="pl-8 bg-muted/30 border-none focus-visible:ring-[#227FD8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Dipendente</TableHead>
                <TableHead className="font-bold">Contratto</TableHead>
                <TableHead className="font-bold">Riposo Settimanale</TableHead>
                <TableHead className="font-bold">Riposo Orario</TableHead>
                <TableHead className="text-right font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-white shadow-sm">
                        <AvatarImage src={employee.photoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{(employee.firstName || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1e293b]">{employee.firstName} {employee.lastName}</span>
                        <span className="text-muted-foreground text-[10px]">{employee.jobTitle}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{employee.contractType}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {DAYS_OF_WEEK.find(d => d.value === employee.restDay)?.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.restStartTime && employee.restEndTime ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {employee.restStartTime} - {employee.restEndTime}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Nessun orario</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(employee)}><Edit className="h-4 w-4 mr-2" /> Modifica</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteEmployee(employee.id)}><Trash2 className="h-4 w-4 mr-2" /> Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Dipendente</DialogTitle></DialogHeader>
          {editingEmployee && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Contratto</Label>
                  <Select value={editingEmployee.contractType} onValueChange={(v) => setEditingEmployee({...editingEmployee, contractType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Giorno Riposo</Label>
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
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label>Inizio Riposo Orario</Label>
                  <Input type="time" value={editingEmployee.restStartTime || ""} onChange={(e) => setEditingEmployee({...editingEmployee, restStartTime: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fine Riposo Orario</Label>
                  <Input type="time" value={editingEmployee.restEndTime || ""} onChange={(e) => setEditingEmployee({...editingEmployee, restEndTime: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleUpdateEmployee} className="bg-[#227FD8]">Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
