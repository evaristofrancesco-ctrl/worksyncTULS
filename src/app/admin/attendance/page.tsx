
"use client"

import { Clock, Download, Filter, Search, Loader2 } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, collectionGroup, query, where } from "firebase/firestore"
import { useState } from "react"

export default function AttendancePage() {
  const db = useFirestore()
  const [searchQuery, setSearchQuery] = useState("")

  // Recupera tutti i dipendenti per mappare gli ID ai nomi
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Recupera i log di presenza reali tramite collectionGroup
  // Rimuoviamo l'orderBy per evitare errori di indici mancanti nel prototipo
  const timeEntriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, "timeentries"),
      where("companyId", "==", "default")
    );
  }, [db])
  const { data: entries, isLoading } = useCollection(timeEntriesQuery)

  // Mappa per accesso rapido ai dati dipendente
  const employeeMap = employees?.reduce((acc, emp) => {
    acc[emp.id] = emp;
    return acc;
  }, {} as any) || {};

  // Filtriamo e ordiniamo in memoria per stabilità
  const filteredEntries = (entries || [])
    .filter(entry => {
      const emp = employeeMap[entry.employeeId];
      if (!emp) return false;
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Registro Presenze</h1>
          <p className="text-muted-foreground">Monitora gli ingressi e le uscite del personale in tempo reale.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filtra
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Esporta CSV
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#227FD8]" />
              <CardTitle className="text-xl font-bold">Log Attività Recente</CardTitle>
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
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold">Entrata</TableHead>
                <TableHead className="font-bold">Uscita</TableHead>
                <TableHead className="font-bold">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredEntries.length > 0 ? filteredEntries.map((log) => {
                const emp = employeeMap[log.employeeId];
                const checkInDate = new Date(log.checkInTime);
                const checkOutDate = log.checkOutTime ? new Date(log.checkOutTime) : null;

                return (
                  <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border shadow-sm">
                          <AvatarImage src={emp?.photoUrl || `https://picsum.photos/seed/${log.employeeId}/100/100`} />
                          <AvatarFallback className="bg-primary/10 text-primary">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[#1e293b]">
                            {emp ? `${emp.firstName} ${emp.lastName}` : "Utente Sconosciuto"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{emp?.jobTitle}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {isNaN(checkInDate.getTime()) ? "Data non valida" : checkInDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {isNaN(checkInDate.getTime()) ? "--:--" : checkInDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {checkOutDate && !isNaN(checkOutDate.getTime()) ? checkOutDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={!log.checkOutTime ? "bg-green-500 hover:bg-green-600" : ""}>
                        {!log.checkOutTime ? "In Servizio" : "Completato"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    Nessun record di presenza trovato nel database.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
