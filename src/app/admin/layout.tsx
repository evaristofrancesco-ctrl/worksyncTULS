
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { useUser } from "@/firebase"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const [displayName, setDisplayName] = useState("Amministratore")
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('ADMIN')

  useEffect(() => {
    // Se non c'è l'utente e il caricamento è finito, torna al login
    if (!isUserLoading && !user) {
      router.replace("/login")
      return;
    }

    if (user?.displayName) {
      setDisplayName(user.displayName)
    } else {
      const savedName = localStorage.getItem("userName")
      if (savedName) setDisplayName(savedName)
    }
    
    const savedRole = localStorage.getItem("userRole")
    if (savedRole) {
      setRole(savedRole.toUpperCase() as 'ADMIN' | 'EMPLOYEE')
    }
  }, [user, isUserLoading, router])

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FA]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#227FD8]" />
          <p className="text-muted-foreground font-medium">Inizializzazione sistema...</p>
        </div>
      </div>
    )
  }

  // Non renderizzare se non c'è l'utente (il redirect avverrà in useEffect)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar userName={displayName} role={role} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
