
"use client"

import { useState } from "react"
import { Settings, Building2, Bell, Shield, Save, Loader2, Globe, Mail, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function SettingsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const companyRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, "companies", "default");
  }, [db])
  
  const { data: company, isLoading } = useDoc(companyRef)

  const handleSaveSettings = () => {
    if (!db) return;
    setIsSaving(true);
    
    // In un'app reale prenderemmo i dati dal form state. 
    // Qui simuliamo il salvataggio basandoci sul riferimento.
    const companyData = {
      name: "TU.L.S. - Gestione Moderna",
      email: "info@tuls.it",
      updatedAt: new Date().toISOString(),
    };

    setDocumentNonBlocking(doc(db, "companies", "default"), companyData, { merge: true });
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Impostazioni Salvate",
        description: "La configurazione di TU.L.S. è stata aggiornata correttamente.",
      });
    }, 800);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#1e293b]">Impostazioni di Sistema</h1>
        <p className="text-muted-foreground">Configura i parametri aziendali e le preferenze di TU.L.S.</p>
      </div>

      <Tabs defaultValue="azienda" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-sm border shadow-sm h-12 p-1">
          <TabsTrigger value="azienda" className="font-bold gap-2">
            <Building2 className="h-4 w-4" /> Azienda
          </TabsTrigger>
          <TabsTrigger value="notifiche" className="font-bold gap-2">
            <Bell className="h-4 w-4" /> Notifiche
          </TabsTrigger>
          <TabsTrigger value="sicurezza" className="font-bold gap-2">
            <Shield className="h-4 w-4" /> Sicurezza
          </TabsTrigger>
        </TabsList>

        <TabsContent value="azienda" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-black">Profilo Aziendale</CardTitle>
              <CardDescription>Informazioni visibili sui portali dei dipendenti e nelle stampe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Nome Azienda</Label>
                  <Input defaultValue={company?.name || "TU.L.S. - Gestione Moderna"} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Sito Web</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" defaultValue="www.tuls.it" />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Email di Contatto</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" defaultValue="info@tuls.it" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Telefono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" defaultValue="+39 02 1234567" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-black">Standard Orari Lavoro</CardTitle>
              <CardDescription>Parametri predefiniti per la generazione dei turni.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Full-time standard (40h)</Label>
                  <p className="text-xs text-muted-foreground">Calcola i progressi settimanali su base 40 ore.</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-primary tracking-wider">Fascia Mattina</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Inizio</Label>
                      <Input type="time" defaultValue="09:00" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Fine</Label>
                      <Input type="time" defaultValue="13:00" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-primary tracking-wider">Fascia Pomeriggio</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Inizio</Label>
                      <Input type="time" defaultValue="17:00" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Fine</Label>
                      <Input type="time" defaultValue="20:00" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifiche" className="mt-6">
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-black">Preferenze Notifiche</CardTitle>
              <CardDescription>Gestisci come e quando l'amministrazione viene avvisata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold">Notifica Nuove Richieste</Label>
                  <p className="text-xs text-muted-foreground">Ricevi un avviso quando un dipendente richiede ferie.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold">Resoconto Settimanale</Label>
                  <p className="text-xs text-muted-foreground">Invia una mail ogni lunedì con il riepilogo delle ore.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sicurezza" className="mt-6">
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-black">Sicurezza e Accessi</CardTitle>
              <CardDescription>Configura i criteri di protezione dei dati.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold">Geofencing Timbratura</Label>
                  <p className="text-xs text-muted-foreground">Consenti la timbratura solo se il dipendente è entro 100m dalla sede.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold">Accesso Anonimo</Label>
                  <p className="text-xs text-muted-foreground">Permetti l'accesso semplificato per prototipazione.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 gap-2 h-12 px-10 font-black shadow-lg"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          SALVA IMPOSTAZIONI
        </Button>
      </div>
    </div>
  )
}
