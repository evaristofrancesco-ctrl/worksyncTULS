
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { useUser } from "@/firebase"

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  const [displayName, setDisplayName] = useState("Dipendente")

  useEffect(() => {
    const savedName = localStorage.getItem("userName")
    if (user?.displayName) {
      setDisplayName(user.displayName)
    } else if (savedName) {
      setDisplayName(savedName)
    }
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="EMPLOYEE" />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar userName={displayName} role="EMPLOYEE" />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-4 z-50">
      </div>
    </div>
  )
}
