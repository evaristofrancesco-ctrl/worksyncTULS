
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
        description: "Inserisci sia l'email che la password.",
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
        
        // Reindirizzamento robusto basato sul ruolo
        if (userRole === 'admin') {
          router.replace("/admin")
        } else {
          router.replace("/employee")
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
        description: "Impossibile contattare il database. Riprova tra poco.",
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#227FD8] text-white text-3xl font-black shadow-lg">T</div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-[#1e293b] uppercase">Accedi a TU.L.S.</CardTitle>
          <CardDescription className="font-bold text-slate-400">Inserisci le tue credenziali aziendali</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-100 py-3">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700 font-bold leading-relaxed uppercase tracking-tight">
                Usa l'email associata al tuo profilo collaboratore per accedere.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-black text-xs uppercase text-slate-500">Email Aziendale</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="mario.rossi@tuls.it" 
                  className="pl-10 h-12 bg-slate-50 border-slate-200" 
                  value={email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-black text-xs uppercase text-slate-500">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 bg-slate-50 border-slate-200"
                  value={password || ""}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-14 text-base uppercase tracking-widest shadow-lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-3" />
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
