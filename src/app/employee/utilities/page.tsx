"use client"

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Info, Loader2, BookOpen, ShieldCheck, FileText, Zap, ChevronRight, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

export default function EmployeeUtilitiesPage() {
  const db = useFirestore()

  const utilitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "utilities"), orderBy("createdAt", "desc"));
  }, [db])

  const { data: utilities, isLoading } = useCollection(utilitiesQuery)

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-16">
      {/* --- HERO HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <Badge className="bg-[#227FD8]/10 text-[#227FD8] hover:bg-[#227FD8]/20 border-none px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
            Hub Risorse & Supporto
          </Badge>
          <h1 className="text-3xl font-black text-[#1e293b] tracking-tighter italic">Centro Utility</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> 
            Manuali, procedure e documentazione aziendale
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-1 account-dot bg-[#227FD8] rounded-full" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Documenti Disponibili</p>
            <p className="text-xs font-bold text-[#1e293b]">{utilities?.length || 0} pubblicazioni</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* --- MAIN RESOURCE CENTER --- */}
        <div className="lg:col-span-8 space-y-6">
          {isLoading ? (
            <div className="py-32 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-100">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#227FD8] opacity-20" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recupero risorse...</p>
            </div>
          ) : utilities && utilities.length > 0 ? (
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-black text-sm uppercase tracking-[0.3em] text-slate-500">Documentazione Ufficiale</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#227FD8] mt-1">Procedure verificate</CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#227FD8] opacity-20" />
              </CardHeader>
              <CardContent className="p-4 sm:p-8">
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {utilities.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border-none">
                      <AccordionTrigger className="hover:no-underline p-5 rounded-2xl bg-white ring-1 ring-slate-100 hover:ring-[#227FD8]/30 hover:bg-slate-50/50 transition-all group data-[state=open]:bg-slate-50 data-[state=open]:ring-[#227FD8]">
                        <div className="flex flex-col items-start text-left gap-1">
                          <span className="font-black text-[#1e293b] text-base group-data-[state=open]:text-[#227FD8]">{item.title}</span>
                          {item.category && (
                            <Badge className="bg-slate-100 text-slate-400 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0 group-data-[state=open]:bg-[#227FD8] group-data-[state=open]:text-white transition-colors">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-6 text-sm leading-relaxed text-slate-600 bg-white/50 animate-in slide-in-from-top-2">
                        <div className="prose prose-slate max-w-none whitespace-pre-wrap font-medium">
                          {item.description}
                        </div>
                        <div className="mt-6 flex items-center justify-end">
                           <Badge variant="outline" className="text-[8px] font-bold text-slate-300 border-slate-100">Ultimo aggiornamento: {new Date(item.createdAt).toLocaleDateString()}</Badge>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : (
             <div className="py-40 text-center bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
               <div className="h-24 w-24 bg-white rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl border border-slate-100 mb-8">
                <FileText className="h-12 w-12 text-slate-50" />
              </div>
              <h3 className="text-2xl font-black text-[#1e293b] tracking-tight italic">Tabula Rasa</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Nessun documento pubblicato al momento.</p>
            </div>
          )}
        </div>

        {/* --- SIDEBAR INFO --- */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="border-none shadow-2xl bg-[#1e293b] text-white rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                 <Zap className="h-32 w-32" />
              </div>
              <CardContent className="p-8 relative z-10 space-y-4">
                 <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                    <History className="h-5 w-5 text-[#227FD8]" />
                 </div>
                 <div>
                    <h4 className="font-black italic text-xl tracking-tight">Need Help?</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed mt-2">
                       Se non trovi quello che cerchi, contatta direttamente il tuo responsabile tramite la sezione comunicazioni.
                    </p>
                 </div>
              </CardContent>
           </Card>

           <div className="p-8 bg-[#227FD8]/5 border border-[#227FD8]/10 rounded-[2rem] space-y-4">
              <p className="text-[10px] font-black uppercase text-[#227FD8] tracking-[0.3em]">Accesso Rapido</p>
              <div className="space-y-2">
                 {['Contatti Emergenza', 'Policy Aziendale', 'Manuale Operativo'].map((link) => (
                    <div key={link} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group cursor-pointer hover:border-[#227FD8] transition-all">
                       <span className="text-xs font-black text-[#1e293b] uppercase tracking-tight">{link}</span>
                       <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-[#227FD8] group-hover:translate-x-1 transition-all" />
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
