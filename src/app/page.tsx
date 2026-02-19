
"use client"

import Link from "next/link"
import { ShieldCheck, ArrowRight, Zap, Calendar, Smartphone, Copy, Check, ExternalLink, Globe, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()
  const [copiedLogin, setCopiedLogin] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)

  const copyLink = (path: string, type: 'login' | 'public') => {
    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url)
    if (type === 'login') {
      setCopiedLogin(true)
      setTimeout(() => setCopiedLogin(false), 2000)
    } else {
      setCopiedPublic(true)
      setTimeout(() => setCopiedPublic(false), 2000)
    }
    toast({
      title: "Link Copiato!",
      description: "Il link è pronto per essere inviato.",
    })
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="space-y-4 max-w-3xl animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
           <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#227FD8] text-white text-4xl font-black shadow-2xl border-4 border-white">T</div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#1e293b]">TU.L.S.</h1>
        <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed">
          Il Portale Operativo di Gestione del Personale.<br className="hidden md:block" />
          Pianificazione, Presenze e Comunicazioni in un unico ecosistema.
        </p>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-[#227FD8] hover:bg-[#227FD8]/90 h-16 px-10 text-xl font-black rounded-2xl shadow-xl group w-full sm:w-auto transition-all hover:scale-105">
            <Link href="/login">
              ACCEDI AL PORTALE <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl font-bold rounded-2xl border-2 hover:bg-slate-100 w-full sm:w-auto">
            <Link href="/public/utilities">
              AREA PUBBLICA <Globe className="ml-2 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700">
        {/* Card Collaboratori */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col gap-6 text-left group hover:ring-2 ring-[#227FD8]/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="h-14 w-14 rounded-2xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8]">
              <Users className="h-8 w-8" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 gap-2 text-[#227FD8] font-black uppercase text-xs tracking-widest hover:bg-blue-50"
              onClick={() => copyLink('/login', 'login')}
            >
              {copiedLogin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedLogin ? "COPIATO" : "COPIA LINK ACCESSO"}
            </Button>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Area Collaboratori</h3>
            <p className="text-slate-500 font-medium">Accesso riservato al team per la gestione dei turni, timbrature e richieste personali.</p>
          </div>
          <Link href="/login" className="mt-2 flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-[#227FD8] transition-colors">
            <span className="font-black text-[#227FD8] tracking-tight">VAI AL LOGIN TEAM</span>
            <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-[#227FD8]" />
          </Link>
        </div>

        {/* Card Esterni */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col gap-6 text-left group hover:ring-2 ring-amber-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Globe className="h-8 w-8" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 gap-2 text-amber-600 font-black uppercase text-xs tracking-widest hover:bg-amber-50"
              onClick={() => copyLink('/public/utilities', 'public')}
            >
              {copiedPublic ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedPublic ? "COPIATO" : "COPIA LINK PUBBLICO"}
            </Button>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Area Esterna</h3>
            <p className="text-slate-500 font-medium">Consultazione bacheca pubblica, manuali e comunicazioni valide per utenti esterni e partner.</p>
          </div>
          <Link href="/public/utilities" className="mt-2 flex items-center justify-between p-5 bg-amber-50/30 rounded-2xl border-2 border-dashed border-amber-200 group-hover:border-amber-500 transition-colors">
            <span className="font-black text-amber-600 tracking-tight">VEDI INFO PUBBLICHE</span>
            <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-amber-600" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-12 text-slate-400 opacity-60 max-w-3xl border-t border-slate-200 pt-12">
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest"><Zap className="h-5 w-5" /> Ottimizzazione</div>
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest"><Calendar className="h-5 w-5" /> Turni</div>
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest"><ShieldCheck className="h-5 w-5" /> Sicurezza</div>
      </div>
    </div>
  )
}
