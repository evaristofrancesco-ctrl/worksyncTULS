"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Search, 
  FolderPlus, 
  Loader2, 
  Filter, 
  Calendar,
  User,
  Files,
  Inbox,
  ArrowRight,
  ShieldCheck,
  Zap,
  MoreVertical,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useStorage, useAuth } from "@/firebase"
import { collection, collectionGroup, doc, query, orderBy, limit, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
]

export default function AdminDocumentsPage() {
  const db = useFirestore()
  const storage = useStorage()
  const auth = useAuth()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const [newDoc, setNewDoc] = useState({
    employeeId: "",
    category: "Busta Paga",
    month: new Date().getMonth().toString(),
    year: new Date().getFullYear().toString(),
    file: null as File | null
  })

  // Fetch employees for the select dropdown
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "employees");
  }, [db])
  const { data: employees } = useCollection(employeesQuery)

  // Fetch all documents from all employees using collectionGroup
  const docsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collectionGroup(db, "documents"), limit(500));
  }, [db])
  const { data: allDocs, isLoading } = useCollection(docsQuery)

  const employeeMap = useMemo(() => {
    if (!employees) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as any);
  }, [employees]);

  const filteredDocs = useMemo(() => {
    if (!allDocs) return [];
    return allDocs.filter(d => {
      const emp = employeeMap[d.employeeId];
      const nameMatch = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const fileNameMatch = d.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === "all" || d.category === categoryFilter;
      return (nameMatch || fileNameMatch) && categoryMatch;
    }).sort((a, b) => {
      const timeA = a.uploadedAt?.toMillis() || 0;
      const timeB = b.uploadedAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [allDocs, searchTerm, categoryFilter, employeeMap]);

  const handleUpload = async () => {
    if (!newDoc.employeeId || !newDoc.file || !storage || !db || !auth?.currentUser) {
      toast({
        title: "Dati mancanti o sessione scaduta",
        description: "Assicurati di essere collegato e di aver selezionato un file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const fileId = Math.random().toString(36).substring(7);
    const fileName = `${MONTHS[parseInt(newDoc.month)]}_${newDoc.year}_${newDoc.file.name}`;
    const storagePath = `documents/${newDoc.employeeId}/${fileId}_${newDoc.file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      // Otteniamo l'ID dell'amministratore corrente per le regole di sicurezza di Storage
      const uploaderId = localStorage.getItem("employeeId") || "unknown";
      
      const uploadTask = uploadBytesResumable(storageRef, newDoc.file, {
        customMetadata: {
          uploaderId: uploaderId
        }
      });

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          toast({ title: "Errore caricamento", description: error.message, variant: "destructive" });
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, "employees", newDoc.employeeId, "documents"), {
            employeeId: newDoc.employeeId,
            fileName: newDoc.file!.name,
            fileUrl: downloadURL,
            storagePath: storagePath,
            category: newDoc.category,
            month: newDoc.month,
            year: newDoc.year,
            uploadedAt: serverTimestamp(),
            uploadedBy: "Admin"
          });

          toast({ title: "Documento caricato", description: "Il file è stato salvato correttamente." });
          setIsUploading(false);
          setIsUploadOpen(false);
          setNewDoc({ ...newDoc, file: null });
          setUploadProgress(0);
        }
      );
    } catch (err: any) {
      console.error(err);
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      setIsUploading(false);
    }
  }

  const handleDelete = async (docObj: any) => {
    if (!db || !storage || !window.confirm("Sei sicuro di voler eliminare questo documento?")) return;

    try {
      const storageRef = ref(storage, docObj.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, "employees", docObj.employeeId, "documents", docObj.id));
      toast({ title: "Eliminato", description: "Documento rimosso con successo." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Errore eliminazione", description: err.message, variant: "destructive" });
    }
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
              Document Management
            </Badge>
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight italic">
                Gestione <span className="text-[#227FD8]">Archivi</span>.
              </h1>
              <p className="text-slate-400 font-medium text-lg max-w-xl leading-relaxed">
                Carica buste paga, CUD e altri documenti riservati per il tuo team in modo sicuro e organizzato.
              </p>
            </div>
          </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-20 px-10 bg-[#227FD8] hover:bg-blue-600 text-white font-black text-lg uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 group border-b-4 border-blue-800">
                <FolderPlus className="mr-3 h-6 w-6 transition-transform group-hover:rotate-12" />
                Carica Nuovo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
              <div className="bg-[#1e293b] p-8 text-white">
                <Badge className="bg-[#227FD8] border-none font-black text-[9px] uppercase tracking-widest mb-4">Upload Portal</Badge>
                <DialogTitle className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
                  <Upload className="h-7 w-7" /> Carica Documento
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium mt-1">
                  Seleziona il dipendente e allega il file. Sarà visibile istantaneamente nella sua area personale.
                </DialogDescription>
              </div>
              
              <div className="p-8 space-y-6 bg-white">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dipendente</Label>
                    <Select onValueChange={(val) => setNewDoc({...newDoc, employeeId: val})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold focus:ring-[#227FD8]">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="font-bold py-3 text-slate-600 focus:bg-blue-50 focus:text-[#227FD8]">
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Categoria</Label>
                    <Select defaultValue="Busta Paga" onValueChange={(val) => setNewDoc({...newDoc, category: val})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold focus:ring-[#227FD8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Busta Paga" className="font-bold">Busta Paga</SelectItem>
                        <SelectItem value="CUD" className="font-bold">CUD</SelectItem>
                        <SelectItem value="Certificazione Unica" className="font-bold">Certificazione Unica</SelectItem>
                        <SelectItem value="Contratto" className="font-bold">Contratto</SelectItem>
                        <SelectItem value="Altro" className="font-bold">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mese</Label>
                    <Select defaultValue={newDoc.month} onValueChange={(val) => setNewDoc({...newDoc, month: val})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl h-60">
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={i.toString()} className="font-bold">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Anno</Label>
                    <Select defaultValue={newDoc.year} onValueChange={(val) => setNewDoc({...newDoc, year: val})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={y.toString()} className="font-bold">{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">File (PDF, PNG, JPG)</Label>
                  <Input 
                    type="file" 
                    className="h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer pt-8 text-center font-bold"
                    onChange={(e) => setNewDoc({...newDoc, file: e.target.files?.[0] || null})}
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {newDoc.file && (
                    <p className="text-[10px] font-black text-[#227FD8] uppercase text-center mt-2">
                      Pronto per l'upload: {newDoc.file.name} ({(newDoc.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#227FD8] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-[9px] font-black text-center text-slate-400 uppercase tracking-widest italic animate-pulse">
                      Caricamento in corso... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsUploadOpen(false)}
                    className="rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest"
                  >
                    Annulla
                  </Button>
                  <Button 
                    disabled={isUploading || !newDoc.file || !newDoc.employeeId}
                    onClick={handleUpload}
                    className="rounded-xl h-14 px-10 bg-[#1e293b] hover:bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Conferma e Invia
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Cerca per nome o file..." 
            className="pl-12 h-14 rounded-2xl border-none shadow-lg shadow-slate-200/50 text-slate-600 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
          {["all", "Busta Paga", "CUD", "Certificazione Unica", "Contratto", "Altro"].map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "secondary"}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-xl h-10 px-6 font-black text-[9px] uppercase tracking-widest transition-all",
                categoryFilter === cat ? "bg-[#1e293b] text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
              )}
            >
              {cat === "all" ? "Tutti" : cat}
            </Button>
          ))}
        </div>
      </div>

      {/* DOCUMENTS LIST */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#227FD8]" /></div>
        ) : filteredDocs.length > 0 ? (
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {filteredDocs?.map((docObj) => {
                  const emp = employeeMap[docObj.employeeId];
                  return (
                    <div key={docObj.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#227FD8] shadow-inner">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-[#1e293b] truncate max-w-[200px] md:max-w-md">{docObj.fileName}</h3>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-slate-200 text-slate-400">
                              {docObj.category}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {docObj.uploadedAt ? format(docObj.uploadedAt.toDate(), "dd MMM yyyy", { locale: it }) : "In sospeso"}
                            </span>
                            {docObj.readConfirmed && (
                              <Badge className="h-5 text-[8px] font-black uppercase bg-green-50 text-green-600 border-green-100 flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Letto
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <AvatarImage src={emp?.photoUrl} />
                            <AvatarFallback className="bg-slate-800 text-white font-black text-[10px]">
                              {emp?.firstName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="hidden md:block text-right">
                            <p className="text-[10px] font-black text-[#1e293b] uppercase leading-none">{emp?.firstName} {emp?.lastName}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">DIPENDENTE</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a href={docObj.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-100 bg-white text-slate-400 hover:text-[#227FD8] hover:border-[#227FD8] hover:bg-blue-50 transition-all shadow-sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDelete(docObj)}
                            className="h-11 w-11 rounded-xl border-slate-100 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="py-24 text-center space-y-4 opacity-50 bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 border-dashed">
            <div className="h-20 w-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200">
              <Files className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Nessun documento trovato</p>
              <p className="text-xs font-bold text-slate-300">Inizia caricando una busta paga o un CUD per un dipendente.</p>
            </div>
            <Button onClick={() => setIsUploadOpen(true)} variant="ghost" className="mt-4 font-black text-[10px] uppercase text-[#227FD8] tracking-widest bg-blue-50 hover:bg-blue-100 rounded-xl px-6">
              Effettua il primo upload
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
