
"use client"

import { Clock, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useMemo } from "react"

export default function MyAttendancePage() {
  const db = useFirestore()
  const { user } = useUser()

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "employees", user.uid, "timeentries"),
      orderBy("checkInTime", "desc")
    );
  }, [db, user])
  
  const { data: entries, isLoading } = useCollection(entriesQuery)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Le Mie Presenze</h1>
        <p className="text-muted-foreground">Riepilogo dei tuoi ingressi e uscite registrati nel sistema TU.L.S.</p>
      </div>

      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#227FD8]" />
            <CardTitle className="text-xl font-black">Storico Personale</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Data</TableHead>
                <TableHead className="font-bold">Entrata</TableHead>
                <TableHead className="font-bold">Uscita</TableHead>
                <TableHead className="font-bold">Durata Stima</TableHead>
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
              ) : entries && entries.length > 0 ? entries.map((log) => {
                const checkIn = new Date(log.checkInTime)
                const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : null
                
                let duration = "--"
                if (checkOut && !isNaN(checkOut.getTime())) {
                  const diff = checkOut.getTime() - checkIn.getTime()
                  const hours = Math.floor(diff / 3600000)
                  const minutes = Math.floor((diff % 3600000) / 60000)
                  duration = `${hours}h ${minutes}m`
                }

                return (
                  <TableRow key={log.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">
                      {checkIn.toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-[#227FD8]">
                      {checkIn.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {checkOut ? checkOut.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </TableCell>
                    <TableCell className="text-sm">{duration}</TableCell>
                    <TableCell>
                      <Badge variant={!log.checkOutTime ? "default" : "secondary"} className={!log.checkOutTime ? "bg-green-500" : ""}>
                        {!log.checkOutTime ? "In Corso" : "Completato"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    Nessuna timbratura registrata finora.
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
