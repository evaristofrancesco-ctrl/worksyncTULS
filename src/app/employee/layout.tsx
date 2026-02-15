"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar role="EMPLOYEE" />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar userName="Michael Chen" role="EMPLOYEE" />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      {/* Mobile Bottom Bar Placeholder */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-4 z-50">
         {/* Simple bottom navigation would go here for mobile */}
      </div>
    </div>
  )
}