
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2, Smartphone, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth, useFirestore } from "@/firebase"
import { signInAnonymously, updateProfile } from "firebase/auth"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
      // 1. Garantiamo l'autenticazione anonima prima di interrogare il DB
      // Se l'utente non è loggato, effettuiamo il login anonimo
      if (!auth.currentUser) {
        await signInAnonymously(auth)
      }

      // 2. Cerchiamo il dipendente nel database
      const employeesRef = collection(db, "employees")
      const q = query(employeesRef, where("email", "==", cleanEmail), limit(1))
      const querySnapshot = await getDocs(q)
      
      let userData: any = null

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data()
        // Verifica password semplice per prototipo
        if (docData.password === cleanPassword) {
          userData = docData
        }
      }

      if (userData) {
        const fullName = `${userData.firstName} ${userData.lastName}`
        
        // Aggiorniamo il profilo per le notifiche di sistema
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: fullName
          });
        }

        // Salviamo la sessione locale
        const userRole = (userData.role || "employee").toLowerCase();
        localStorage.setItem("userRole", userRole)
        localStorage.setItem("userName", fullName)
        localStorage.setItem("employeeId", userData.id)

        toast({
          title: "Accesso effettuato",
          description: `Bentornato, ${fullName}!`,
        })
        
        // Redirect in base al ruolo
        if (userRole === 'admin') {
          router.replace("/admin")
        } else {
          router.replace("/employee")
        }
      } else {
        toast({
          variant: "destructive",
          title: "Credenziali errate",
          description: "L'email o la password non corrispondono a nessun profilo.",
        })
      }
    } catch (error: any) {
      console.error("Login Error:", error)
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Controlla la tua connessione internet e riprova.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-none animate-in fade-in zoom-in duration-300 overflow-hidden">
        <div className="bg-[#227FD8] h-2 w-full" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#227FD8] text-white text-4xl font-black shadow-lg">T</div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-[#1e293b] uppercase">TU.L.S. Cloud</CardTitle>
          <CardTitle className="text-sm font-bold text-slate-400">Accedi per gestire il tuo lavoro</CardTitle>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-100 py-4">
              <Globe className="h-5 w-5 text-blue-600" />
              <div className="ml-2">
                <AlertTitle className="text-blue-800 font-bold text-xs uppercase">Accesso Dipendenti</AlertTitle>
                <AlertDescription className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  Usa l'email e la password fornite dall'amministrazione. Non è necessario un account Google.
                </AlertDescription>
              </div>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Email Aziendale</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="mario.rossi@tuls.it" 
                  className="pl-10 h-12 bg-slate-50 border-slate-200" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 bg-slate-50 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button type="submit" className="w-full bg-[#227FD8] hover:bg-[#227FD8]/90 font-black h-14 text-base uppercase tracking-widest shadow-lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-3" /> Entrata in corso...</>
              ) : (
                "Accedi al Portale"
              )}
            </Button>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              <Smartphone className="h-3 w-3" />
              Ottimizzato per Mobile e Tablet
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
