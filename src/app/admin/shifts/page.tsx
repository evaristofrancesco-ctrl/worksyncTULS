
"use client"

import { useState, useMemo } from "react"
import { Calendar, Plus, Sparkles, UserCheck, AlertTriangle, CheckCircle2, Loader2, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/table"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup } from "firebase/firestore"
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ShiftsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

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

  // Funzione di utilità per verificare se un orario è compreso in una fascia di riposo
  const isTimeInRestRange = (time: Date, restStartStr: string, restEndStr: string) => {
    if (!restStartStr || !restEndStr) return false;
    
    const [h, m] = [time.getHours(), time.getMinutes()];
    const [rsH, rsM] = restStartStr.split(':').map(Number);
    const [reH, reM] = restEndStr.split(':').map(Number);
    
    const currentTimeMinutes = h * 60 + m;
    const restStartMinutes = rsH * 60 + rsM;
    const restEndMinutes = reH * 60 + reM;
    
    return currentTimeMinutes >= restStartMinutes && currentTimeMinutes < restEndMinutes;
  };

  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato." })
      return
    }

    setIsGenerating(true)
    
    try {
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)))
      startOfWeek.setHours(0, 0, 0, 0)

      for (const emp of employees) {
        for (let i = 0; i < 6; i++) { // Lun-Sab
          const currentDate = new Date(startOfWeek)
          currentDate.setDate(startOfWeek.getDate() + i)
          const dayOfWeek = currentDate.getDay().toString()
          
          if (dayOfWeek === emp.restDay) continue;

          // TURNO MATTINA: 09:00-13:00
          const startTimeAM = new Date(currentDate)
          startTimeAM.setHours(9, 0, 0)
          const endTimeAM = new Date(currentDate)
          endTimeAM.setHours(13, 0, 0)

          // Verifica se l'inizio del turno ricade nell'orario di riposo
          if (!isTimeInRestRange(startTimeAM, emp.restStartTime, emp.restEndTime)) {
            const morningShiftId = `shift-${emp.id}-${currentDate.getTime()}-AM`
            const morningRef = doc(db, "employees", emp.id, "shifts", morningShiftId)
            
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
          }

          // TURNO POMERIGGIO: 17:00-20:00 (Solo Full-time)
          if (emp.contractType === "full-time") {
            const startTimePM = new Date(currentDate)
            startTimePM.setHours(17, 0, 0)
            const endTimePM = new Date(currentDate)
            endTimePM.setHours(20, 0, 0)

            if (!isTimeInRestRange(startTimePM, emp.restStartTime, emp.restEndTime)) {
              const afternoonShiftId = `shift-${emp.id}-${currentDate.getTime()}-PM`
              const afternoonRef = doc(db, "employees", emp.id, "shifts", afternoonShiftId)
              
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
      }

      toast({ title: "Turni generati", description: "Pianificazione completata rispettando i riposi." })
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
    return [...shifts]
      .filter(s => s.companyId === "default")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [shifts]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Gestione Turni</h1>
          <p className="text-muted-foreground">Pianificazione automatica basata su contratti e fasce di riposo orarie.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleAutoGenerate} 
            disabled={isGenerating} 
            className="gap-2 border-[#227FD8] text-[#227FD8] hover:bg-[#227FD8] hover:text-white font-bold"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera Automatica
          </Button>
          <Button className="gap-2 bg-[#227FD8]">
            <Plus className="h-4 w-4" /> Nuovo Turno
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#227FD8]" />
            <CardTitle>Programma Settimanale</CardTitle>
          </div>
          <CardDescription>Visualizzazione consolidata di tutti i turni attivi.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Dipendente</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold">Orario Lavoro</TableHead>
                <TableHead className="font-bold">Tipo Turno</TableHead>
                <TableHead className="text-right font-bold">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isShiftsLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : sortedShifts.length > 0 ? sortedShifts.map((shift) => {
                const emp = employeeMap[shift.employeeId];
                const start = new Date(shift.startTime);
                const end = new Date(shift.endTime);

                return (
                  <TableRow key={shift.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border shadow-xs">
                          <AvatarImage src={emp?.photoUrl} />
                          <AvatarFallback className="text-[10px]">{(emp?.firstName || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm">{emp ? `${emp.firstName} ${emp.lastName}` : "Sconosciuto"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {start.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">
                      {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - 
                      {end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-wider px-2 py-0">
                        {shift.title}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteShift(shift.employeeId, shift.id)}>
                        <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    Nessun turno in programma. Usa "Genera Automatica" per iniziare.
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
