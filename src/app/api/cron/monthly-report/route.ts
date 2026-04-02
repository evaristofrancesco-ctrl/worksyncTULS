import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { calculateMonthlyReportsData, generateExcelHTML } from '@/lib/report-utils';
import { sendReportEmail } from '@/ai/flows/send-report-flow';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

// Initialize Firebase (Server-side compatible)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export async function GET(req: NextRequest) {
  // Security Check
  const authHeader = req.headers.get('Authorization');
  // In produzione dovresti usare una variabile d'ambiente: process.env.CRON_SECRET
  if (authHeader !== `Bearer x-worksync-cron-2024`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Determina il mese precedente
    const now = new Date();
    const prevMonthDate = subMonths(now, 1);
    const month = prevMonthDate.getMonth().toString();
    const year = prevMonthDate.getFullYear().toString();
    const monthLabel = MONTHS[prevMonthDate.getMonth()];

    console.log(`[CRON] Generazione report per ${monthLabel} ${year}`);

    // 2. Fetch di tutti i dati necessari (Senza hooks, usando getDocs)
    // Nota: in un export reale da Firebase Studio, le collezioni sono spesso raggruppate
    // ma qui usiamo i percorsi standard o collectionGroup se necessario.
    
    // Per semplicità e performance carichiamo i dati necessari
    const employeesSnap = await getDocs(collection(db, "employees"));
    const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const holidaysSnap = await getDocs(collection(db, "holidays"));
    const allHolidays = holidaysSnap.docs.map(doc => doc.data());

    // Per timeentries, shifts e requests usiamo date range per ottimizzare
    // ma dato che il sistema è piccolo e il limite è 10k, un fetch globale o mirato va bene.
    // Qui usiamo un fetch delle collezioni principali (o collectionGroup se sono sotto-collezioni)
    
    // In questo progetto le collezioni sembrano essere globali o emulate come tali
    // Se fossero sotto utenti, servirebbe collectionGroup.
    
    const timeEntriesSnap = await getDocs(collection(db, "timeentries"));
    const allEntries = timeEntriesSnap.docs.map(doc => doc.data());

    const shiftsSnap = await getDocs(collection(db, "shifts"));
    const allShifts = shiftsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const requestsSnap = await getDocs(collection(db, "requests"));
    const allRequests = requestsSnap.docs.map(doc => doc.data());

    // 3. Elaborazione dati
    const processedData = calculateMonthlyReportsData({
      employees,
      allEntries,
      allRequests,
      allShifts,
      allHolidays,
      selectedMonth: month,
      selectedYear: year
    });

    // 4. Generazione HTML bodies
    const excelContent = generateExcelHTML(processedData, monthLabel, year);

    // Specchietto per il corpo della mail (HTML semplice)
    let summaryHtml = `
      <h3>Riepilogo Presenze - ${monthLabel} ${year}</h3>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr style="background-color: #f1f5f9;">
          <th>Collaboratore</th>
          <th>Ore Lavorative</th>
          <th>Ore Effettive</th>
          <th>Assenze</th>
          <th>Netto</th>
        </tr>
    `;
    processedData.summary.forEach((s: any) => {
      summaryHtml += `
        <tr>
          <td>${s.name}</td>
          <td align="center">${s.theoreticalHoursStr}</td>
          <td align="center">${s.workedHoursStr}</td>
          <td align="center">${s.absenceHoursStr}</td>
          <td align="center" style="font-weight: bold; color: ${parseFloat(s.totalNetStr) < 0 ? '#ef4444' : '#10b981'};">
            ${parseFloat(s.totalNetStr) > 0 ? '+' : ''}${s.totalNetStr}
          </td>
        </tr>
      `;
    });
    summaryHtml += `</table><p>In allegato trovi il report dettagliato in formato Excel.</p>`;

    // 5. Invio Email
    const emailResult = await sendReportEmail({
      recipientEmail: "tuls@laltrasigaretta.com", 
      monthLabel,
      year,
      fileContent: excelContent,
      htmlBody: summaryHtml,
      adminName: "Sistema Automatico WorkSync"
    });

    if (!emailResult.success) {
      throw new Error(emailResult.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Report per ${monthLabel} ${year} inviato con successo.` 
    });

  } catch (error: any) {
    console.error('[CRON ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
