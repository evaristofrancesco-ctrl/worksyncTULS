"use client"

import Link from "next/link"
import { ShieldCheck, ArrowRight, Zap, Calendar, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="space-y-4 max-w-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#227FD8] text-white text-3xl font-black shadow-xl">T</div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-[#1e293b]">TU.L.A.S</h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed">
          La piattaforma di gestione del personale tutto-in-uno progettata per i team moderni.
          Pianificazione intelligente, monitoraggio in tempo reale e ottimizzazione basata su AI.
        </p>
        <div className="pt-6">
          <Link href="/login">
            <Button size="lg" className="bg-[#227FD8] hover:bg-[#227FD8]/90 h-14 px-8 text-lg font-bold rounded-2xl shadow-lg group">
              Accedi al Portale <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl w-full animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Accesso Unificato</p>
              <p className="text-sm text-slate-500">Il sistema riconosce automaticamente il tuo ruolo.</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="h-1 w-12 rounded-full bg-slate-100" />
             <div className="h-1 w-12 rounded-full bg-slate-100" />
             <div className="h-1 w-12 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-12 text-slate-400 opacity-60 max-w-3xl border-t border-slate-200 pt-12">
        <div className="flex items-center gap-2 font-bold"><Zap className="h-5 w-5" /> Ottimizzazione AI</div>
        <div className="flex items-center gap-2 font-bold"><Calendar className="h-5 w-5" /> Turni Intelligenti</div>
        <div className="flex items-center gap-2 font-bold"><Smartphone className="h-5 w-5" /> Mobile First</div>
      </div>
    </div>
  )
}
