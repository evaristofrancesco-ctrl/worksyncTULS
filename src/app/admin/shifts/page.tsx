
"use client"

import { useState, useMemo } from "react"
import { Calendar, Plus, Sparkles, UserCheck, AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup, query } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  // Recupera i dipendenti
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Recupera tutti i turni (di tutti i dipendenti)
  const shiftsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, "shifts");
  }, [db])
  const { data: shifts, isLoading: isShiftsLoading } = useCollection(shiftsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  // Funzione per generare i turni automatici per la settimana corrente
  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato." })
      return
    }

    setIsGenerating(true)
    
    try {
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)) // Lunedì

      for (const emp of employees) {
        // Ciclo sui 6 giorni lavorativi (Lun-Sab)
        for (let i = 0; i < 6; i++) {
          const currentDate = new Date(startOfWeek)
          currentDate.setDate(startOfWeek.getDate() + i)
          
          const dayOfWeek = currentDate.getDay().toString()
          
          // Salta se è il giorno di riposo del dipendente
          if (dayOfWeek === emp.restDay) continue;

          // ORARI PUNTO VENDITA: 09:00-13:00 e 17:00-20:00
          
          // TURNO MATTINA (Sempre per tutti)
          const morningShiftId = `shift-${emp.id}-${currentDate.getTime()}-AM`
          const morningRef = doc(db, "employees", emp.id, "shifts", morningShiftId)
          
          const startTimeAM = new Date(currentDate)
          startTimeAM.setHours(9, 0, 0)
          const endTimeAM = new Date(currentDate)
          endTimeAM.setHours(13, 0, 0)

          setDocumentNonBlocking(morningRef, {
            id: morningShiftId,
            employeeId: emp.id,
            title: "Turno Mattina",
            date: currentDate.toISOString().split('T')[0],
            startTime: startTimeAM.toISOString(),
            endTime: endTimeAM.toISOString(),
            status: "SCHEDULED",
            companyId: "default"
          }, { merge: true })

          // TURNO POMERIGGIO (Solo se Full-time)
          if (emp.contractType === "full-time") {
            const afternoonShiftId = `shift-${emp.id}-${currentDate.getTime()}-PM`
            const afternoonRef = doc(db, "employees", emp.id, "shifts", afternoonShiftId)
            
            const startTimePM = new Date(currentDate)
            startTimePM.setHours(17, 0, 0)
            const endTimePM = new Date(currentDate)
            endTimePM.setHours(20, 0, 0)

            setDocumentNonBlocking(afternoonRef, {
              id: afternoonShiftId,
              employeeId: emp.id,
              title: "Turno Pomeriggio",
              date: currentDate.toISOString().split('T')[0],
              startTime: startTimePM.toISOString(),
              endTime: endTimePM.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true })
          }
        }
      }

      toast({ title: "Turni generati", description: "La pianificazione settimanale è pronta." })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Errore", description: "Impossibile generare i turni." })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteShift = (employeeId: string, shiftId: string) => {
    const shiftRef = doc(db, "employees", employeeId, "shifts", shiftId)
    deleteDocumentNonBlocking(shiftRef)
    toast({ title: "Turno eliminato" })
  }

  const sortedShifts = useMemo(() => {
    if (!shifts) return [];
    return [...shifts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [shifts]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Gestione Turni</h1>
          <p className="text-muted-foreground">Pianifica automaticamente il lavoro basandoti sui contratti.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleAutoGenerate} 
            disabled={isGenerating} 
            className="gap-2 border-[#227FD8] text-[#227FD8] hover:bg-[#227FD8] hover:text-white"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera Turni Settimanali
          </Button>
          <Button className="gap-2 bg-[#227FD8]">
            <Plus className="h-4 w-4" /> Nuovo Turno
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Programma della Settimana</CardTitle>
          <CardDescription>Visualizzazione di tutti i turni assegnati.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Dipendente</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold">Orario</TableHead>
                <TableHead className="font-bold">Tipo</TableHead>
                <TableHead className="text-right font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isShiftsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : sortedShifts.length > 0 ? sortedShifts.map((shift) => {
                const emp = employeeMap[shift.employeeId];
                const startDate = new Date(shift.startTime);
                const endDate = new Date(shift.endTime);

                return (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback>{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {startDate.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - 
                      {endDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {shift.title}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteShift(shift.employeeId, shift.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    Nessun turno programmato. Usa il pulsante in alto per generare i turni settimanali.
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
