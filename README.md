
# TU.L.S. - Gestione Moderna del Personale

Piattaforma avanzata per la gestione di dipendenti, turni e presenze, ottimizzata per il web e dispositivi mobili.

## Caratteristiche principali
- **Anagrafica Completa**: Gestione dettagliata dei dati personali e contrattuali.
- **Turni Intelligenti**: Generazione automatica basata sui riposi e sulle fasce orarie speciali (es. Regole Savino).
- **Layout a Doppio Slot**: Visualizzazione fissa per sede (Palese in alto, Bisceglie in basso) per un allineamento perfetto.
- **Registro Presenze**: Timbratura manuale e automatica con arrotondamenti intelligenti.
- **Gestione Richieste**: Sistema di approvazione per ferie, permessi e movimentazioni "Entra/Esce".

## 🛡️ Salvataggi e Punti di Ripristino (Backup)

Per proteggere il tuo lavoro e poter tornare indietro in caso di errori, segui queste procedure:

### 1. Utilizzo di GitHub (Scelta Consigliata)
Il modo migliore per creare un "punto di ripristino" è usare Git:
- **Commit frequenti**: Ogni volta che l'app raggiunge uno stato che ti soddisfa, esegui un `commit` con un messaggio chiaro (es. "Fissato layout turni e notifiche").
- **Branch**: Se vuoi provare modifiche rischiose, crea un nuovo `branch`. Se qualcosa va male, puoi semplicemente cancellarlo e tornare al branch `main`.
- **Ripristino**: In caso di problemi, puoi usare il comando `git checkout <id-commit>` per riportare l'intero progetto allo stato esatto di quel momento.

## 🚀 Prestazioni e Prevenzione Standby (Cold Boot)

L'apertura dell'ambiente di sviluppo può richiedere dai 15 ai 45 minuti a causa del provisioning della macchina virtuale Google Cloud.

### Come evitare le attese (Soluzione Standby)
Per evitare che il sistema vada in ibernazione e dover attendere ogni volta il caricamento:
1. **Tieni la scheda aperta**: Il server rimane attivo finché rileva una connessione attiva dal browser.
2. **Appunta la scheda (Pin)**: Fai tasto destro sulla scheda di questo portale nel browser e seleziona "Appunta" (o "Pin"). Questo aiuta a ricordarti di non chiuderla.
3. **Attività periodica**: Se prevedi di non usare il sistema per qualche ora ma vuoi riprenderlo velocemente, non chiudere la finestra. Il sistema rimarrà "caldo" e pronto all'uso istantaneo.

## 🧠 Glossario Tecnico
- **Conversational UI (CUI)**: Interfaccia utente basata sul dialogo naturale (questa chat).
- **Agentic Interface**: Un sistema capace di agire sul codice e sul database autonomamente.
- **Cold Boot**: Il tempo di avvio necessario quando il server si è spento per inattività.

## Come pubblicare il progetto (Deployment)

1. **GitHub**: Carica il codice su un repository.
2. **Console Firebase**: Vai su "App Hosting", connetti il repository e avvia la build.
3. **Dominio**: Punta il tuo dominio seguendo le istruzioni DNS di Firebase.
