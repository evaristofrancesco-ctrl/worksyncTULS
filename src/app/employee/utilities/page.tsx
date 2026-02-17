
"use client"

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Info, Loader2, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function EmployeeUtilitiesPage() {
  const db = useFirestore()

  const utilitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "utilities"), orderBy("createdAt", "desc"));
  }, [db])

  const { data: utilities, isLoading } = useCollection(utilitiesQuery)

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b] flex items-center gap-3">
          <Info className="h-8 w-8 text-[#227FD8]" />
          UTILITY
        </h1>
        <p className="text-muted-foreground">Informazioni utili, manuali e procedure aziendali.</p>
      </div>

      <div className="max-w-4xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
            <p className="text-muted-foreground font-medium">Caricamento utility...</p>
          </div>
        ) : utilities && utilities.length > 0 ? (
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#227FD8]" />
                Centro Risorse
              </CardTitle>
              <CardDescription>Clicca sui titoli per espandere le informazioni.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {utilities.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="border-b last:border-0">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-black text-[#1e293b] text-base">{item.title}</span>
                        {item.category && (
                          <span className="text-[10px] font-black uppercase text-[#227FD8] tracking-widest mt-1">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 leading-relaxed whitespace-pre-wrap py-4">
                      {item.description}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm py-24">
            <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
              <Info className="h-16 w-16 text-muted-foreground/20" />
              <div>
                <p className="text-xl font-bold text-[#1e293b]">Nessuna informazione disponibile</p>
                <p className="text-sm text-muted-foreground">L'amministrazione non ha ancora caricato contenuti in questa sezione.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
