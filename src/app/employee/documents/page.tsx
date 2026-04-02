"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  FileText, 
  Download, 
  Search, 
  Loader2, 
  Calendar,
  Files,
  Inbox,
  ArrowRight,
  ShieldCheck,
  Zap,
  FolderOpen,
  History,
  TrendingUp,
  LayoutGrid,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function EmployeeDocumentsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setMounted(true)
    setEmployeeId(localStorage.getItem("employeeId"))
  }, [])

  const docsQuery = useMemoFirebase(() => {
    if (!db || !employeeId) return null;
    return query(
      collection(db, "employees", employeeId, "documents"), 
      orderBy("uploadedAt", "desc"), 
      limit(100)
    );
  }, [db, employeeId])
  
  const { data: documents, isLoading } = useCollection(docsQuery)

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(d => 
      d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const stats = useMemo(() => {
    if (!documents) return { total: 0, lastMonth: 0 };
    const now = new Date();
    const lastMonth = documents.filter(d => {
      if (!d.uploadedAt) return false;
      const date = d.uploadedAt.toDate();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total: documents.length, lastMonth };
  }, [documents]);

  const handleConfirmRead = async (docId: string) => {
    if (!db || !employeeId) return;
    const docRef = doc(db, "employees", employeeId, "documents", docId);
    updateDocumentNonBlocking(docRef, {
      readConfirmed: true,
      readAt: serverTimestamp()
    });
    toast({
      title: "Lettura Confermata",
      description: "La tua conferma è stata registrata correttamente.",
    });
  }

  if (!mounted) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1e293b] p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-[#227FD8]/20 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl opacity-30" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <Badge className="bg-[#227FD8] hover:bg-[#227FD8] text-white border-none px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
              Personal Archive
            </Badge>
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight italic">
                I Miei <span className="text-[#227FD8]">Documenti</span>.
              </h1>
              <p className="text-slate-400 font-medium text-lg max-w-xl leading-relaxed">
                Accedi alle tue buste paga, certificazioni uniche e contratti in qualsiasi momento.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl min-w-[160px] text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#227FD8] mb-1">Totale File</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black tracking-tighter">{stats.total}</span>
                <Files className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <TabsList className="bg-white/50 backdrop-blur-md border border-slate-100 p-1.5 rounded-2xl h-14 shadow-sm w-full md:w-auto">
            <TabsTrigger value="all" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#1e293b] data-[state=active]:text-white shadow-none border-none h-full transition-all">
              Tutti
            </TabsTrigger>
            <TabsTrigger value="Busta Paga" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#1e293b] data-[state=active]:text-white shadow-none border-none h-full transition-all">
              Buste Paga
            </TabsTrigger>
            <TabsTrigger value="CUD" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#1e293b] data-[state=active]:text-white shadow-none border-none h-full transition-all">
              CUD / CU
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cerca file..." 
              className="pl-11 h-12 rounded-xl border-none shadow-lg shadow-slate-100 text-slate-600 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {["all", "Busta Paga", "CUD"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 outline-none">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
              ) : filteredDocs.filter(d => tab === "all" || d.category === tab).length > 0 ? (
                filteredDocs.filter(d => tab === "all" || d.category === tab).map((docObj) => (
                  <Card key={docObj.id} className="group border-none shadow-xl shadow-slate-100 bg-white rounded-[2rem] overflow-hidden hover:scale-[1.02] transition-all duration-300 ring-1 ring-slate-100">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#227FD8] group-hover:bg-[#227FD8] group-hover:text-white transition-colors shadow-inner">
                          <FileText className="h-6 w-6" />
                        </div>
                        <Badge variant="outline" className="font-black text-[8px] uppercase tracking-widest py-1 border-slate-200 text-slate-400">
                          {docObj.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-black text-[#1e293b] text-base leading-tight truncate" title={docObj.fileName}>
                          {docObj.fileName}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                          <History className="h-3 w-3" />
                          Caricato: {docObj.uploadedAt ? format(docObj.uploadedAt.toDate(), "dd MMMM yyyy", { locale: it }) : "..."}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <a href={docObj.fileUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                          <Button className="w-full rounded-xl h-12 bg-slate-50 hover:bg-[#1e293b] text-[#1e293b] hover:text-white font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 shadow-sm flex items-center justify-between px-5">
                            Scarica Documento
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        
                        {docObj.readConfirmed ? (
                          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border border-green-100">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-[9px] font-black text-green-700 uppercase tracking-widest leading-none">
                              Lettura Confermata il {docObj.readAt ? format(docObj.readAt.toDate(), "dd/MM/yyyy HH:mm") : "..."}
                            </span>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleConfirmRead(docObj.id)}
                            variant="outline"
                            className="w-full rounded-xl h-12 border-2 border-dashed border-slate-200 hover:border-[#227FD8] hover:text-[#227FD8] hover:bg-blue-50/50 font-black text-[10px] uppercase tracking-widest transition-all group/confirm"
                          >
                            <AlertCircle className="h-4 w-4 mr-2 text-slate-400 group-hover/confirm:text-[#227FD8]" />
                            Conferma Lettura
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-24 text-center space-y-4 opacity-40 bg-white rounded-[2.5rem] border border-slate-50 border-dashed">
                  <div className="h-20 w-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200">
                    <FolderOpen className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Nessun file qui</p>
                    <p className="text-xs font-bold text-slate-300">Non ci sono ancora documenti caricati in questa categoria.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
