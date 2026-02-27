'use server';
/**
 * @fileOverview Flusso Genkit per l'invio automatico del report mensile via email.
 * 
 * Esporta:
 * - sendReportEmail: Funzione per generare il testo con AI e inviare il CSV tramite SMTP Serverplan.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as nodemailer from 'nodemailer';

const SendReportInputSchema = z.object({
  recipientEmail: z.string().email(),
  monthLabel: z.string(),
  year: z.string(),
  csvContent: z.string(),
  adminName: z.string(),
});

const SendReportOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const reportEmailPrompt = ai.definePrompt({
  name: 'reportEmailPrompt',
  input: {schema: SendReportInputSchema},
  output: {schema: z.object({ subject: z.string(), body: z.string() })},
  prompt: `Sei l'assistente amministrativo di TU.L.S.
OBIETTIVO: Scrivi una mail formale per inviare il report presenze mensile di {{{monthLabel}}} {{{year}}}.

DATI:
- Mittente: {{{adminName}}}
- Allegato: Report presenze in formato CSV.

REGOLE:
1. Tono professionale ed efficiente.
2. Specifica che in allegato si trova il conteggio delle ore e delle assenze.
3. Oggetto: [TU.L.S.] Invio Report Presenze - {{{monthLabel}}} {{{year}}}.

Restituisci solo oggetto e corpo.`,
});

/**
 * Definizione del flusso Genkit per l'invio del report.
 * Deve essere definito prima della funzione esportata che lo richiama.
 */
const sendReportFlow = ai.defineFlow(
  {
    name: 'sendReportFlow',
    inputSchema: SendReportInputSchema,
    outputSchema: SendReportOutputSchema,
  },
  async (input) => {
    try {
      // 1. Genera testo mail con AI
      const {output} = await reportEmailPrompt(input);
      if (!output) throw new Error('Errore generazione testo AI');

      // 2. Configura Trasportatore SMTP (Serverplan)
      const transporter = nodemailer.createTransport({
        host: "mail.laltrasigaretta.com",
        port: 465,
        secure: true, // true per porta 465, false per altre porte
        auth: {
          user: process.env.SMTP_USER || "tuls@laltrasigaretta.com",
          pass: process.env.SMTP_PASS || "c97bd8f3-cdab-4113-8771-7f77503331c2", 
        },
      });

      const fileName = `Report_Presenze_${input.monthLabel.replace(/\s+/g, '_')}_${input.year}.csv`;

      // 3. Invia Email con allegato
      await transporter.sendMail({
        from: '"TU.L.S. Cloud" <tuls@laltrasigaretta.com>',
        to: input.recipientEmail,
        subject: output.subject,
        text: output.body,
        attachments: [
          {
            filename: fileName,
            content: input.csvContent,
          },
        ],
      });

      return { success: true, message: 'Email inviata con successo.' };
    } catch (error: any) {
      console.error('Email Error:', error);
      return { success: false, message: `Errore: ${error.message || 'Invio fallito'}` };
    }
  }
);

/**
 * Funzione wrapper esportata per richiamare il flusso dal lato client.
 */
export async function sendReportEmail(input: z.infer<typeof SendReportInputSchema>): Promise<z.infer<typeof SendReportOutputSchema>> {
  return sendReportFlow(input);
}
