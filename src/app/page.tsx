"use client"

import Link from "next/link"
import { ShieldCheck, User, ArrowRight, Zap, Calendar, Smartphone } from "lucide-react"
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
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl w-full animate-in slide-in-from-bottom-8 duration-700">
        <Link href="/admin" className="group">
          <div className="h-full bg-white p-8 rounded-3xl border-2 border-transparent hover:border-[#227FD8] hover:shadow-2xl transition-all duration-300 text-left space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8] group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Portale Amministratore</h3>
              <p className="text-slate-500 mt-2">Gestisci il tuo personale, approva le richieste e usa l'AI per ottimizzare i turni.</p>
            </div>
            <div className="flex items-center text-[#227FD8] font-bold gap-2">
              Entra nella Dashboard <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/employee" className="group">
          <div className="h-full bg-white p-8 rounded-3xl border-2 border-transparent hover:border-[#33CCCC] hover:shadow-2xl transition-all duration-300 text-left space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-[#33CCCC]/10 flex items-center justify-center text-[#33CCCC] group-hover:scale-110 transition-transform">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">App Dipendente</h3>
              <p className="text-slate-500 mt-2">Controlla i tuoi turni, timbra l'ingresso e invia richieste di ferie in modo semplice.</p>
            </div>
            <div className="flex items-center text-[#33CCCC] font-bold gap-2">
              Accedi al mio Account <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      <div className="flex flex-wrap justify-center gap-12 text-slate-400 opacity-60 max-w-3xl border-t border-slate-200 pt-12">
        <div className="flex items-center gap-2 font-bold"><Zap className="h-5 w-5" /> Ottimizzazione AI</div>
        <div className="flex items-center gap-2 font-bold"><Calendar className="h-5 w-5" /> Turni Intelligenti</div>
        <div className="flex items-center gap-2 font-bold"><Smartphone className="h-5 w-5" /> Mobile First</div>
      </div>
    </div>
  )
}
