# TU.L.S. - Gestione Moderna del Personale

Piattaforma avanzata per la gestione di dipendenti, turni e presenze, ottimizzata per il web e dispositivi mobili.

## Caratteristiche principali
- **Anagrafica Completa**: Gestione dettagliata dei dati personali e contrattuali (FT 46h / PT 23h).
- **Turni Intelligenti**: Generazione automatica basata sui riposi e sulle fasce orarie.
- **Registro Presenze**: Timbratura manuale e automatica sincronizzata in tempo reale.
- **Gestione Richieste**: Sistema di approvazione/rifiuto con feedback per i dipendenti.

## Come pubblicare il progetto (Deployment)

Questo progetto è pronto per essere caricato online su un tuo dominio utilizzando **Firebase App Hosting**.

### Passaggi per la messa online:
1. **GitHub**: Carica l'intero codice del progetto su un tuo repository GitHub privato o pubblico.
2. **Console Firebase**: 
   - Vai su [console.firebase.google.com](https://console.firebase.google.com/).
   - Crea un nuovo progetto o usane uno esistente.
   - Attiva **Firestore** e **Authentication**.
3. **App Hosting**:
   - Nella barra laterale di Firebase, seleziona "App Hosting".
   - Clicca su "Get Started" e connetti il tuo account GitHub.
   - Seleziona il repository del progetto e segui la procedura guidata.
4. **Dominio Personalizzato**:
   - Una volta completato il primo deployment, vai nelle impostazioni di App Hosting.
   - Troverai l'opzione per aggiungere il tuo dominio (es. `gestione.tuodominio.it`).
   - Segui le istruzioni per configurare i record DNS (A, CNAME o TXT) presso il tuo provider di dominio.

### Sviluppo Locale
Per avviare il progetto in locale:
```bash
npm install
npm run dev
```
L'app sarà disponibile su `http://localhost:9002`.
