"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Recupera il ruolo dell'utente da Firestore
      const employeeDoc = await getDoc(doc(db, "employees", user.uid))
      
      if (employeeDoc.exists()) {
        const userData = employeeDoc.data()
        toast({
          title: "Accesso effettuato",
          description: `Benvenuto, ${userData.firstName || 'Utente'}!`,
        })
        
        if (userData.role === 'admin') {
          router.push("/admin")
        } else {
          router.push("/employee")
        }
      } else {
        throw new Error("Profilo utente non trovato.")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: "Credenziali non valide o utente non trovato.",
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
          <CardTitle className="text-2xl font-bold tracking-tight">Accedi a TU.L.A.S</CardTitle>
          <CardDescription>Inserisci le tue credenziali per accedere al portale</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Aziendale</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nome@tulas.com" 
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
            <Button className="w-full bg-[#227FD8] hover:bg-[#227FD8]/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Accedi
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
