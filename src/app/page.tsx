
"use client"

import Link from "next/link"
import { ShieldCheck, ArrowRight, Zap, Calendar, Smartphone, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copyLoginLink = () => {
    const loginUrl = `${window.location.origin}/login`
    navigator.clipboard.writeText(loginUrl)
    setCopied(true)
    toast({
      title: "Link Copiato!",
      description: "Puoi inviare questo link ai tuoi collaboratori.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="space-y-4 max-w-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-6">
           <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#227FD8] text-white text-3xl font-black shadow-xl">T</div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-[#1e293b]">TU.L.S.</h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed">
          La piattaforma di gestione del personale tutto-in-uno progettata per i team moderni.
          Pianificazione intelligente, monitoraggio in tempo reale e ottimizzazione basata su AI.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-[#227FD8] hover:bg-[#227FD8]/90 h-14 px-8 text-lg font-bold rounded-2xl shadow-lg group w-full sm:w-auto">
            <Link href="/login">
              Accedi al Portale <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 text-left">
          <div className="h-12 w-12 rounded-xl bg-[#227FD8]/10 flex items-center justify-center text-[#227FD8] shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Accesso Unificato</p>
            <p className="text-sm text-slate-500">Il sistema riconosce automaticamente se sei Admin o Collaboratore.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center gap-4 text-left">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-800">Link Accesso Collaboratori</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-2 text-[#227FD8] font-bold"
              onClick={copyLoginLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiato" : "Copia Link"}
            </Button>
          </div>
          <Link href="/login" className="block group">
            <div className="bg-slate-50 p-4 rounded-xl border border-dashed flex items-center justify-between hover:bg-blue-50 transition-colors border-slate-200 group-hover:border-[#227FD8]">
              <code className="text-sm font-black text-[#227FD8] tracking-tight">VAI AL LOGIN COLLABORATORI</code>
              <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-[#227FD8] transition-colors" />
            </div>
          </Link>
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
