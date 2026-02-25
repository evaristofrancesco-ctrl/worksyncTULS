
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

### 2. Backup Manuale Locale
Se non hai dimestichezza con Git, puoi scaricare periodicamente l'intero progetto sul tuo computer:
- Copia la cartella del progetto in una cartella di backup (es. `TU.L.S._Backup_DATA`).
- In caso di problemi gravi, potrai sovrascrivere i file attuali con quelli della copia di backup.

## Come pubblicare il progetto (Deployment)

Questo progetto è basato su **Next.js**. La procedura consigliata è ospitare l'applicazione su **Firebase App Hosting**.

1. **GitHub**: Carica il codice su un repository.
2. **Console Firebase**: Vai su "App Hosting", connetti il repository e avvia la build.
3. **Dominio**: Punta il tuo dominio (es. Serverplan) seguendo le istruzioni DNS fornite dalla console Firebase.
