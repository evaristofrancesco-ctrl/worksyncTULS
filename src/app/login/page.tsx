
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth, useFirestore } from "@/firebase"
import { signInAnonymously, updateProfile } from "firebase/auth"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanEmail = (email || "").trim().toLowerCase()
    const cleanPassword = (password || "").trim()

    if (!cleanEmail || !cleanPassword) {
      toast({
        variant: "destructive",
        title: "Campi richiesti",
        description: "Inserisci sia l'email/username che la password.",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Ricerca dell'utente nel database Firestore
      const employeesRef = collection(db, "employees")
      const q = query(employeesRef, where("email", "==", cleanEmail), limit(1))
      const querySnapshot = await getDocs(q)
      
      let userData: any = null

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data()
        // Verifica della password
        if (docData.password === cleanPassword) {
          userData = docData
        }
      }

      if (userData) {
        // Autenticazione anonima per i permessi Firestore
        await signInAnonymously(auth)
        
        const fullName = `${userData.firstName} ${userData.lastName}`
        
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: fullName
          });
        }

        // Memorizziamo il ruolo, il nome e l'ID REALE del dipendente
        const userRole = (userData.role || "").toLowerCase();
        localStorage.setItem("userRole", userRole)
        localStorage.setItem("userName", fullName)
        localStorage.setItem("employeeId", userData.id)

        toast({
          title: "Accesso effettuato",
          description: `Bentornato, ${fullName}!`,
        })
        
        if (userRole === 'admin') {
          router.push("/admin")
        } else {
          router.push("/employee")
        }
      } else {
        toast({
          variant: "destructive",
          title: "Credenziali errate",
          description: "L'email o la password inserite non sono corrette.",
        })
      }
    } catch (error: any) {
      console.error("Login Error:", error)
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Impossibile contattare il database o errore di autenticazione.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-none animate-in fade-in zoom-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#227FD8] text-white text-2xl font-black shadow-lg">T</div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#1e293b]">Accedi a TU.L.S.</CardTitle>
          <CardDescription>Inserisci le tue credenziali aziendali</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-100 py-2">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                Usa le credenziali associate al tuo profilo dipendente.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email o Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  placeholder="es. mario.rossi" 
                  className="pl-10" 
                  value={email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10"
                  value={password || ""}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-[#227FD8] hover:bg-[#227FD8]/90 font-bold h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifica in corso...
                </>
              ) : (
                "Accedi al Portale"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
