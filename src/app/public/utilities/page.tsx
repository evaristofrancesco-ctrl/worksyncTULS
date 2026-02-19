
"use client"

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Info, Loader2, BookOpen, ArrowLeft, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PublicUtilitiesPage() {
  const db = useFirestore()

  const utilitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "utilities"), orderBy("createdAt", "desc"));
  }, [db])

  const { data: utilities, isLoading } = useCollection(utilitiesQuery)

  return (
    <div className="min-h-screen bg-[#F4F8FA]">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-[#227FD8] mb-4">
              <Globe className="h-6 w-6" />
              <span className="font-black uppercase tracking-widest text-sm">Portale Pubblico TU.L.S.</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#1e293b]">Utilities & Info</h1>
            <p className="text-lg text-slate-500 font-medium">Risorse e bacheca informativa accessibile per utenti esterni.</p>
          </div>
          <Button asChild variant="ghost" className="font-black text-[#227FD8] hover:bg-blue-50 h-12 px-6">
            <Link href="/"><ArrowLeft className="mr-2 h-5 w-5" /> TORNA ALLA HOME</Link>
          </Button>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-[#227FD8]" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Caricamento bacheca...</p>
            </div>
          ) : utilities && utilities.length > 0 ? (
            <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-md">
              <CardHeader className="bg-[#227FD8] text-white p-8">
                <div className="flex items-center gap-4 mb-2">
                  <BookOpen className="h-8 w-8 text-blue-100" />
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">Centro Risorse Pubblico</CardTitle>
                </div>
                <CardDescription className="text-blue-50 text-lg">
                  Informazioni aziendali ufficiali e procedure operative condivise.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Accordion type="single" collapsible className="w-full">
                  {utilities.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border-b last:border-0 border-slate-100">
                      <AccordionTrigger className="hover:no-underline py-6 group">
                        <div className="flex flex-col items-start text-left">
                          <span className="font-black text-[#1e293b] text-xl group-hover:text-[#227FD8] transition-colors">{item.title}</span>
                          {item.category && (
                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full tracking-widest mt-2 border border-amber-100">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed whitespace-pre-wrap py-6 text-lg border-t border-slate-50 mt-2">
                        {item.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm bg-white/80 py-32 text-center rounded-[2rem]">
              <CardContent className="flex flex-col items-center justify-center gap-6 opacity-30">
                <Info className="h-20 w-20 text-slate-300" />
                <div className="space-y-2">
                  <p className="text-2xl font-black text-[#1e293b] uppercase tracking-tighter">Nessuna informazione disponibile</p>
                  <p className="text-slate-500 font-medium">L'amministrazione non ha ancora pubblicato contenuti pubblici.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="pt-12 text-center">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} TU.L.S. - Sistema Certificato di Gestione Operativa
          </p>
        </footer>
      </div>
    </div>
  )
}
