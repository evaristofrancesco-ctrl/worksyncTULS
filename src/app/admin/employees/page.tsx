
"use client"

import { useState } from "react"
import { Plus, Search, MoreVertical, UserPlus, MapPin, Trash2, Loader2, Edit, Save } from "lucide-react"
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
  })

  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  const handleAddEmployee = () => {
    // Normalizziamo l'email/username in minuscolo per facilitare il login
    const cleanEmail = newEmployee.email.trim().toLowerCase()
    const cleanPassword = newEmployee.password.trim()

    if (!newEmployee.firstName || !newEmployee.lastName || !cleanEmail || !newEmployee.jobTitle || !cleanPassword) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Per favore compila tutti i campi obbligatori (Nome, Cognome, Email/Username, Qualifica, Password).",
      })
      return
    }

    const tempId = `emp-${Date.now()}`
    const selectedLoc = locations?.find(l => l.id === newEmployee.locationId)
    const employeeRef = doc(db, "employees", tempId)

    const employeeData = {
      id: tempId,
      firstName: newEmployee.firstName.trim(),
      lastName: newEmployee.lastName.trim(),
      email: cleanEmail,
      password: cleanPassword,
      role: newEmployee.isAdmin ? 'admin' : 'employee',
      jobTitle: newEmployee.jobTitle.trim(),
      department: newEmployee.department.trim() || "Generale",
      isActive: true,
      hireDate: new Date().toISOString(),
      companyId: "default",
      locationId: newEmployee.locationId || "",
      locationName: selectedLoc?.name || "Nessuna",
      contractType: "full-time"
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
      locationId: ""
    })
    
    toast({
      title: "Successo!",
      description: `${employeeData.firstName} ${employeeData.lastName} è stato aggiunto. Credenziali: ${cleanEmail}`,
    })
  }

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return;

    const cleanEmail = editingEmployee.email.trim().toLowerCase()
    
    if (!editingEmployee.firstName || !editingEmployee.lastName || !cleanEmail || !editingEmployee.jobTitle) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Per favore compila i campi obbligatori.",
      })
      return
    }

    const selectedLoc = locations?.find(l => l.id === editingEmployee.locationId)
    const employeeRef = doc(db, "employees", editingEmployee.id)

    const updateData = {
      ...editingEmployee,
      firstName: editingEmployee.firstName.trim(),
      lastName: editingEmployee.lastName.trim(),
      email: cleanEmail,
      jobTitle: editingEmployee.jobTitle.trim(),
      locationName: selectedLoc?.name || "Nessuna",
      role: editingEmployee.isAdmin ? 'admin' : 'employee'
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

  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">Visualizza e gestisci l'anagrafica del tuo team.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#227FD8] hover:bg-[#227FD8]/90">
              <Plus className="h-4 w-4" />
              Aggiungi Dipendente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#227FD8]" />
                Nuovo Dipendente
              </DialogTitle>
              <DialogDescription>
                Inserisci i dati del nuovo membro e le sue credenziali di accesso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Informazioni Personali</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input 
                      id="firstName" 
                      placeholder="Mario" 
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Rossi" 
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email / Username di Accesso</Label>
                  <Input 
                    id="email" 
                    placeholder="es. mario.rossi" 
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">Verrà convertito in minuscolo per l'accesso.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ruolo e Sede</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Qualifica</Label>
                    <Input 
                      id="jobTitle" 
                      placeholder="es. Senior Developer" 
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Sede Operativa (Opzionale)</Label>
                    <Select value={newEmployee.locationId} onValueChange={(v) => setNewEmployee({...newEmployee, locationId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona sede" />
                      </SelectTrigger>
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
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Credenziali e Accessi</h4>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Privilegi Amministratore</Label>
                    <p className="text-xs text-muted-foreground">Consente l'accesso alla dashboard admin</p>
                  </div>
                  <Switch 
                    checked={newEmployee.isAdmin} 
                    onCheckedChange={(checked) => setNewEmployee({...newEmployee, isAdmin: checked})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password Iniziale</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="••••••••" 
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleAddEmployee} className="bg-[#227FD8] hover:bg-[#227FD8]/90">
                Salva Dipendente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-[#1e293b]">Team TU.L.A.S</CardTitle>
              <CardDescription>
                Totale {filteredEmployees.length} dipendenti registrati nel sistema.
              </CardDescription>
            </div>
            <div className="relative w-full max-sm:max-w-none max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, ruolo o email..."
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
                <TableHead className="rounded-l-lg font-bold">Dipendente</TableHead>
                <TableHead className="font-bold">Ruolo</TableHead>
                <TableHead className="font-bold">Sede</TableHead>
                <TableHead className="text-right rounded-r-lg font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${employee.id}/200/200`} alt={employee.firstName} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{employee.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1e293b]">{employee.firstName} {employee.lastName}</span>
                          {employee.role === 'admin' && (
                            <Badge className="bg-[#227FD8]/10 text-[#227FD8] border-none text-[9px] h-4 px-1">ADMIN</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">{employee.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{employee.jobTitle}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-[#227FD8]" />
                      <span className="font-medium">{employee.locationName || "Non assegnata"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-muted/50 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(employee)}>
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive cursor-pointer font-medium" onClick={() => handleDeleteEmployee(employee.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!employeesLoading && filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nessun dipendente trovato. Aggiungine uno nuovo per iniziare.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog per la modifica */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#227FD8]" />
              Modifica Dipendente
            </DialogTitle>
            <DialogDescription>
              Aggiorna le informazioni del profilo di {editingEmployee?.firstName}.
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">Nome</Label>
                    <Input 
                      id="edit-firstName" 
                      value={editingEmployee.firstName}
                      onChange={(e) => setEditingEmployee({...editingEmployee, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Cognome</Label>
                    <Input 
                      id="edit-lastName" 
                      value={editingEmployee.lastName}
                      onChange={(e) => setEditingEmployee({...editingEmployee, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email / Username</Label>
                  <Input 
                    id="edit-email" 
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-jobTitle">Qualifica</Label>
                    <Input 
                      id="edit-jobTitle" 
                      value={editingEmployee.jobTitle}
                      onChange={(e) => setEditingEmployee({...editingEmployee, jobTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Sede Operativa</Label>
                    <Select value={editingEmployee.locationId} onValueChange={(v) => setEditingEmployee({...editingEmployee, locationId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona sede" />
                      </SelectTrigger>
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
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Privilegi Amministratore</Label>
                  </div>
                  <Switch 
                    checked={editingEmployee.isAdmin} 
                    onCheckedChange={(checked) => setEditingEmployee({...editingEmployee, isAdmin: checked})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">Cambia Password (lascia vuoto per non modificare)</Label>
                  <Input 
                    id="edit-password" 
                    type="password"
                    placeholder="••••••••" 
                    value={editingEmployee.password}
                    onChange={(e) => setEditingEmployee({...editingEmployee, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleUpdateEmployee} className="bg-[#227FD8] hover:bg-[#227FD8]/90 gap-2">
              <Save className="h-4 w-4" /> Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
