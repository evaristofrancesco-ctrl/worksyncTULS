'use server';
/**
 * @fileOverview Flusso Genkit per la generazione di bozze email professionali.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DraftEmailInputSchema = z.object({
  recipientName: z.string(),
  eventType: z.string().describe('Tipo di evento (es. LEAVE_APPROVED, MODIFICATION_REJECTED)'),
  details: z.string().describe('Dettagli della richiesta o motivazioni'),
  adminName: z.string(),
});

const DraftEmailOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export async function draftEmail(input: z.infer<typeof DraftEmailInputSchema>): Promise<z.infer<typeof DraftEmailOutputSchema>> {
  return draftEmailFlow(input);
}

const draftEmailPrompt = ai.definePrompt({
  name: 'draftEmailPrompt',
  input: {schema: DraftEmailInputSchema},
  output: {schema: DraftEmailOutputSchema},
  prompt: `Sei l'assistente virtuale dell'ufficio HR di TU.L.S. (Gestione Moderna del Personale).
OBIETTIVO: Scrivi una mail professionale, cordiale e sintetica in italiano per un dipendente.

DATI CONTESTUALI:
- Destinatario: {{{recipientName}}}
- Evento: {{{eventType}}}
- Dettagli/Note: {{{details}}}
- Firma: {{{adminName}}} - Ufficio Amministrazione TU.L.S.

REGOLE DI SCRITTURA:
1. Oggetto: Deve essere chiaro e includere [TU.L.S.].
2. Tono: Professionale ma non eccessivamente formale (usa il "Tu" se appropriato per un team moderno).
3. Struttura: Saluto, corpo con l'esito della richiesta, eventuali passi successivi, chiusura cordiale.

Restituisci solo l'oggetto e il corpo.`,
});

const draftEmailFlow = ai.defineFlow(
  {
    name: 'draftEmailFlow',
    inputSchema: DraftEmailInputSchema,
    outputSchema: DraftEmailOutputSchema,
  },
  async (input) => {
    const {output} = await draftEmailPrompt(input);
    if (!output) throw new Error('Errore generazione email');
    return output;
  }
);
