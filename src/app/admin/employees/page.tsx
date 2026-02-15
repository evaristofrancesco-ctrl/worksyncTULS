"use client"

import { Plus, Search, Mail, Phone, MapPin, MoreVertical } from "lucide-react"
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
import { mockEmployees } from "@/lib/mock-data"

export default function EmployeesPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Dipendenti</h1>
          <p className="text-muted-foreground">Visualizza e gestisci l'anagrafica del tuo team.</p>
        </div>
        <Button className="gap-2 bg-primary">
          <Plus className="h-4 w-4" />
          Aggiungi Dipendente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Team TU.L.A.S</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, ruolo o email..."
                className="pl-8 bg-muted/50 border-none"
              />
            </div>
          </div>
          <CardDescription>
            Totale {mockEmployees.length} dipendenti registrati nel sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dipendente</TableHead>
                <TableHead>Ruolo / Dipartimento</TableHead>
                <TableHead>Competenze</TableHead>
                <TableHead>Data Inizio</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={employee.avatarUrl} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium">{employee.name}</span>
                        <span className="text-muted-foreground text-xs">{employee.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{employee.position}</span>
                      <span className="text-muted-foreground text-xs">{employee.department}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
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
                    <span className="text-sm text-muted-foreground">
                      {new Date(employee.joinDate).toLocaleDateString('it-IT')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifica Profilo</DropdownMenuItem>
                        <DropdownMenuItem>Vedi Turni</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
