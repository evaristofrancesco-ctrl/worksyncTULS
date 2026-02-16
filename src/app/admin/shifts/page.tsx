
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
} from "@/components/ui/table"
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

  const handleAutoGenerate = async () => {
    if (!employees || employees.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Nessun dipendente trovato nell'anagrafica." })
      return
    }

    setIsGenerating(true)
    
    try {
      const today = new Date()
      // Inizia dal Lunedì della settimana corrente
      const startOfWeek = new Date(today.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)))
      startOfWeek.setHours(0, 0, 0, 0)

      let totalGenerated = 0

      for (const emp of employees) {
        if (!emp.isActive) continue;

        for (let i = 0; i < 6; i++) { // Da Lunedì (0) a Sabato (5)
          const currentDate = new Date(startOfWeek)
          currentDate.setDate(startOfWeek.getDate() + i)
          const dayOfWeek = currentDate.getDay().toString() // 1 (Lun) - 6 (Sab)
          
          // Salta se è il suo giorno di riposo
          if (dayOfWeek === emp.restDay) continue;

          // LOGICA FULL TIME (46h): 09:00-13:00 e 17:00-20:00
          if (emp.contractType === "full-time") {
            // Turno Mattina
            const startAM = new Date(currentDate); startAM.setHours(9, 0, 0);
            const endAM = new Date(currentDate); endAM.setHours(13, 0, 0);
            const idAM = `shift-${emp.id}-${currentDate.getTime()}-AM`;
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idAM), {
              id: idAM,
              employeeId: emp.id,
              title: "Turno Mattina",
              date: currentDate.toISOString().split('T')[0],
              startTime: startAM.toISOString(),
              endTime: endAM.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });

            // Turno Pomeriggio
            const startPM = new Date(currentDate); startPM.setHours(17, 0, 0);
            const endPM = new Date(currentDate); endPM.setHours(20, 0, 0);
            const idPM = `shift-${emp.id}-${currentDate.getTime()}-PM`;
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPM), {
              id: idPM,
              employeeId: emp.id,
              title: "Turno Pomeriggio",
              date: currentDate.toISOString().split('T')[0],
              startTime: startPM.toISOString(),
              endTime: endPM.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });
            
            totalGenerated += 2;
          } 
          // LOGICA PART TIME (23h): Solo 17:00-20:00
          else {
            const startPT = new Date(currentDate); startPT.setHours(17, 0, 0);
            const endPT = new Date(currentDate); endPT.setHours(20, 0, 0);
            const idPT = `shift-${emp.id}-${currentDate.getTime()}-PT`;
            
            setDocumentNonBlocking(doc(db, "employees", emp.id, "shifts", idPT), {
              id: idPT,
              employeeId: emp.id,
              title: "Turno Pomeriggio (PT)",
              date: currentDate.toISOString().split('T')[0],
              startTime: startPT.toISOString(),
              endTime: endPT.toISOString(),
              status: "SCHEDULED",
              companyId: "default"
            }, { merge: true });
            
            totalGenerated += 1;
          }
        }
      }

      toast({ title: "Pianificazione Completata", description: `Generati ${totalGenerated} turni (FT: 9-13/17-20, PT: 17-20).` })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Errore durante la generazione" })
    } finally {
      setIsGenerating(false)
    }
  }

  const sortedShifts = useMemo(() => {
    if (!shifts) return [];
    return [...shifts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [shifts]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Pianificazione Turni TU.L.S.</h1>
          <p className="text-muted-foreground">Gestione automatizzata: FT (9-13, 17-20), PT (17-20).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isGenerating} className="gap-2 border-[#227FD8] text-[#227FD8] font-black">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera Turni Settimanali
          </Button>
          <Button className="gap-2 bg-[#227FD8] font-black shadow-md"><Plus className="h-4 w-4" /> Nuovo Turno</Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#227FD8]" />
            <CardTitle className="text-xl font-black">Programma Lavoro</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Dipendente</TableHead>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold">Orario</TableHead>
                <TableHead className="font-bold">Tipo</TableHead>
                <TableHead className="text-right font-bold pr-6">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isShiftsLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : sortedShifts.length > 0 ? sortedShifts.map((shift) => {
                const emp = employeeMap[shift.employeeId];
                const start = new Date(shift.startTime);
                const end = new Date(shift.endTime);
                return (
                  <TableRow key={shift.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold">
                        <Avatar className="h-8 w-8 border"><AvatarImage src={emp?.photoUrl} /><AvatarFallback className="font-bold">{emp?.firstName?.charAt(0)}</AvatarFallback></Avatar>
                        <span>{emp ? `${emp.firstName} ${emp.lastName}` : "---"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{start.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}</TableCell>
                    <TableCell className="font-mono text-xs font-black text-[#227FD8]">
                      {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase">{shift.title}</Badge></TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => deleteDocumentNonBlocking(doc(db, "employees", shift.employeeId, "shifts", shift.id))}>
                        <Trash2 className="h-4 w-4 text-destructive/50 hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow><TableCell colSpan={5} className="py-32 text-center text-muted-foreground italic font-medium">Nessun turno pianificato. Usa il tasto "Genera" in alto.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
