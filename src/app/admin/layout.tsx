"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="ADMIN" />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar userName="Sarah Johnson" role="ADMIN" />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}