
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { useUser } from "@/firebase"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  const [displayName, setDisplayName] = useState("Amministratore")

  useEffect(() => {
    // Cerchiamo di ottenere il nome reale dal profilo o dal localStorage
    const savedName = localStorage.getItem("userName")
    if (user?.displayName) {
      setDisplayName(user.displayName)
    } else if (savedName) {
      setDisplayName(savedName)
    }
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="ADMIN" />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar userName={displayName} role="ADMIN" />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
