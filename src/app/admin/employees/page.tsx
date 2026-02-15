
"use client"

import { useState } from "react"
import { Plus, Search, MoreVertical, UserPlus, Lock, User as UserIcon } from "lucide-react"
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
import { mockEmployees as initialEmployees } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Employee, Role } from "@/lib/types"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  // Stato per il nuovo dipendente
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    skills: "",
    isAdmin: false,
    username: "",
    password: "",
  })

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.position || !newEmployee.username || !newEmployee.password) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Per favore compila i campi obbligatori (Nome, Email, Ruolo, Username e Password).",
      })
      return
    }

    const employeeToAdd: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.isAdmin ? 'ADMIN' as Role : 'EMPLOYEE' as Role,
      position: newEmployee.position,
      department: newEmployee.department || "Generale",
      avatarUrl: `https://picsum.photos/seed/${newEmployee.name}/200/200`,
      skills: newEmployee.skills.split(',').map(s => s.trim()).filter(s => s !== ""),
      availability: "Lun-Ven, 9:00-17:00",
      joinDate: new Date().toISOString().split('T')[0],
      remainingLeave: 20,
    }

    setEmployees([employeeToAdd, ...employees])
    setIsDialogOpen(false)
    setNewEmployee({ 
      name: "", 
      email: "", 
      position: "", 
      department: "", 
      skills: "", 
      isAdmin: false,
      username: "",
      password: "" 
    })
    
    toast({
      title: "Successo!",
      description: `${newEmployee.name} è stato aggiunto al team come ${newEmployee.isAdmin ? 'Amministratore' : 'Dipendente'}.`,
    })
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">Visualizza e gestisci l'anagrafica del tuo team.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Nome</Label>
                  <Input 
                    id="name" 
                    placeholder="Mario Rossi" 
                    className="col-span-3" 
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="mario.rossi@tulas.com" 
                    className="col-span-3"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ruolo e Competenze</h4>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="position" className="text-right">Qualifica</Label>
                  <Input 
                    id="position" 
                    placeholder="es. Senior Developer" 
                    className="col-span-3"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">Dipartimento</Label>
                  <Select onValueChange={(v) => setNewEmployee({...newEmployee, department: v})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleziona dipartimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Ingegneria</SelectItem>
                      <SelectItem value="Product">Prodotto</SelectItem>
                      <SelectItem value="People Operations">Risorse Umane</SelectItem>
                      <SelectItem value="Sales">Vendite</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="skills" className="text-right">Competenze</Label>
                  <Input 
                    id="skills" 
                    placeholder="Separati da virgola (es. React, SQL)" 
                    className="col-span-3"
                    value={newEmployee.skills}
                    onChange={(e) => setNewEmployee({...newEmployee, skills: e.target.value})}
                  />
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right flex items-center justify-end gap-2">
                    <UserIcon className="h-3 w-3" /> Username
                  </Label>
                  <Input 
                    id="username" 
                    placeholder="m.rossi" 
                    className="col-span-3"
                    value={newEmployee.username}
                    onChange={(e) => setNewEmployee({...newEmployee, username: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right flex items-center justify-end gap-2">
                    <Lock className="h-3 w-3" /> Password
                  </Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="••••••••" 
                    className="col-span-3"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleAddEmployee} className="bg-[#227FD8] hover:bg-[#227FD8]/90">Salva Dipendente</Button>
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
                Totale {filteredEmployees.length} dipendenti filtrati nel sistema.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
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
                <TableHead className="font-bold">Ruolo / Dipartimento</TableHead>
                <TableHead className="font-bold">Competenze</TableHead>
                <TableHead className="font-bold">Data Inizio</TableHead>
                <TableHead className="text-right rounded-r-lg font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-white shadow-sm">
                        <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1e293b]">{employee.name}</span>
                          {employee.role === 'ADMIN' && (
                            <Badge className="bg-[#227FD8]/10 text-[#227FD8] border-none text-[9px] h-4 px-1">ADMIN</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">{employee.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-[#1e293b]">{employee.position}</span>
                      <span className="text-muted-foreground text-xs">{employee.department}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#33CCCC]/10 text-[#2a9d9d] border-none">
                          {skill}
                        </Badge>
                      ))}
                      {employee.skills.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{employee.skills.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground font-medium">
                      {new Date(employee.joinDate).toLocaleDateString('it-IT')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-muted/50 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer">Modifica Profilo</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">Vedi Turni</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive cursor-pointer font-medium">Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEmployees.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">Nessun dipendente trovato</h3>
              <p className="text-sm text-slate-400">Prova a cambiare i termini della ricerca.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
