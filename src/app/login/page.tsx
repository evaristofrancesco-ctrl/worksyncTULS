
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2, Info, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth, useFirestore } from "@/firebase"
import { signInAnonymously } from "firebase/auth"
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
    if (!email || !password) return

    setIsLoading(true)
    
    // Logica di Login per il Prototipo: Cerchiamo l'utente in Firestore
    try {
      // 1. Cerchiamo il dipendente per email o username
      const employeesRef = collection(db, "employees")
      const q = query(employeesRef, where("email", "==", email), limit(1))
      const querySnapshot = await getDocs(q)
      
      let userData: any = null

      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data()
      } else if (email === "admin" && password === "admin") {
        // Fallback per l'admin predefinito
        userData = { firstName: "Admin", lastName: "Prototipo", role: "admin", password: "admin" }
      }

      // 2. Verifica password
      if (userData && userData.password === password) {
        // Effettuiamo un accesso anonimo per soddisfare i requisiti di sicurezza "isSignedIn()" di Firebase
        await signInAnonymously(auth)
        
        toast({
          title: "Accesso effettuato",
          description: `Bentornato, ${userData.firstName}!`,
        })
        
        // 3. Reindirizzamento in base al ruolo
        if (userData.role === 'admin') {
          router.push("/admin")
        } else {
          router.push("/employee")
        }
      } else {
        toast({
          variant: "destructive",
          title: "Errore di accesso",
          description: "Email o password non corretti.",
        })
      }
    } catch (error: any) {
      console.error("Login Error:", error)
      toast({
        variant: "destructive",
        title: "Errore di sistema",
        description: "Impossibile completare l'accesso. Riprova più tardi.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#227FD8] text-white text-2xl font-black shadow-lg">T</div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#1e293b]">Accedi a TU.L.A.S</CardTitle>
          <CardDescription>Inserisci le tue credenziali aziendali</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-100 py-2">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                Usa <strong>admin</strong> / <strong>admin</strong> o qualsiasi account creato nella gestione dipendenti.
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-[#227FD8] hover:bg-[#227FD8]/90 font-bold" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Accedi al Portale
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
