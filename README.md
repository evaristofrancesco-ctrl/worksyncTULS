# TU.L.S. - Gestione Moderna del Personale

Piattaforma avanzata per la gestione di dipendenti, turni e presenze, ottimizzata per il web e dispositivi mobili.

## Caratteristiche principali
- **Anagrafica Completa**: Gestione dettagliata dei dati personali e contrattuali (FT 46h / PT 23h).
- **Turni Intelligenti**: Generazione automatica basata sui riposi e sulle fasce orarie.
- **Registro Presenze**: Timbratura manuale e automatica sincronizzata in tempo reale.
- **Gestione Richieste**: Sistema di approvazione/rifiuto con feedback e note dell'amministratore.

## Come pubblicare il progetto (Deployment)

Questo progetto è basato su **Next.js** e richiede un ambiente Node.js. Se hai un dominio su **Serverplan**, la procedura consigliata è ospitare l'applicazione su **Firebase App Hosting** e puntare il dominio.

### 1. Preparazione (GitHub)
- Crea un repository su GitHub (privato o pubblico).
- Carica tutto il codice del progetto sul repository.

### 2. Configurazione Firebase
- Vai su [console.firebase.google.com](https://console.firebase.google.com/).
- Seleziona il tuo progetto.
- Nella barra laterale, vai su **App Hosting** e clicca su "Inizia".
- Connetti il tuo account GitHub e seleziona il repository creato.
- Firebase configurerà automaticamente la build e pubblicherà l'app su un dominio temporaneo (es. `tuls-123.web.app`).

### 3. Collegamento Dominio Serverplan
Per usare il tuo dominio (es. `www.tuodominio.it`):
1. Nella console Firebase, vai in **App Hosting** -> **Impostazioni** -> **Domini**.
2. Clicca su **Aggiungi dominio personalizzato**.
3. Firebase ti fornirà dei valori (Record **A** e/o **CNAME**).
4. Accedi al tuo pannello **Serverplan**:
   - Vai nella gestione **DNS** del tuo dominio.
   - Aggiungi i Record forniti da Firebase (solitamente due record di tipo A con gli IP indicati).
5. Attendi la propagazione DNS (da pochi minuti a 24 ore). Firebase genererà automaticamente il certificato SSL (HTTPS) per te.

### Perché non usare l'FTP di Serverplan?
Le app Next.js non sono file statici; hanno bisogno di un server che esegua codice JavaScript (Node.js). Firebase App Hosting gestisce questo processo in modo automatico e gratuito, offrendoti prestazioni migliori e scalabilità.
