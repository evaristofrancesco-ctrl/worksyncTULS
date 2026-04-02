---
description: Trasferire il progetto WorkSync su un nuovo PC
---

Segui questi passaggi per migrare il progetto su un altro computer mantenendo tutte le configurazioni:

### 1. Utilizzare Git (Metodo raccomandato)
Se non lo hai già fatto, carica il progetto su un repository remoto (GitHub/GitLab):
1. Sul PC attuale, assicurati di aver fatto il commit di tutte le modifiche:
   ```bash
   git add .
   git commit -m "Backup prima del trasferimento"
   ```
2. Crea un repository su GitHub e collegalo:
   ```bash
   git remote add origin https://github.com/tuo-username/worksync.git
   git push -u origin main
   ```
3. Sul nuovo PC, clona il repository:
   ```bash
   git clone https://github.com/tuo-username/worksync.git
   ```

### 2. Copiare i File Sensibili (.env)
Il file `.env` è ignorato da Git per sicurezza. Devi copiarlo manualmente o ricrearlo sul nuovo PC:
1. Copia il file `.env` dal PC originale.
2. Incollalo nella cartella radice del progetto sul nuovo PC.

### 3. Installare le Dipendenze
Una volta che i file sono sul nuovo PC, apri il terminale nella cartella del progetto ed esegui:
```bash
npm install
```

### 4. Configurazione Firebase
Assicurati che il nuovo PC sia autorizzato ad accedere al backend Firebase:
1. Installa i Firebase Tools (se non presenti):
   ```bash
   npm install -g firebase-tools
   ```
2. Effettua l'accesso:
   ```bash
   firebase login
   ```
3. Verifica che il progetto corretto sia selezionato:
   ```bash
   firebase use studio-6505277913-dc6f8
   ```

### 5. Avvio Locale
Testa che tutto funzioni correttamente:
```bash
npm run dev
```
Il progetto sarà ora accessibile su `http://localhost:3000`.
