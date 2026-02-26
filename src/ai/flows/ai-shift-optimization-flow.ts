'use server';
/**
 * @fileOverview Flusso Genkit ottimizzato per la generazione rapida dei turni.
 *
 * - aiShiftOptimization - Funzione per l'assegnazione rapida del personale agli slot.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  availability: z.string().describe('Giorno di riposo (0=Dom, 1=Lun...)'),
});

const ShiftSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

const AiShiftOptimizationInputSchema = z.object({
  employees: z.array(EmployeeSchema),
  shifts: z.array(ShiftSchema),
});

const OptimizedAssignmentSchema = z.object({
  shiftId: z.string(),
  employeeId: z.string(),
});

const AiShiftOptimizationOutputSchema = z.object({
  optimizedAssignments: z.array(OptimizedAssignmentSchema),
});

export async function aiShiftOptimization(input: z.infer<typeof AiShiftOptimizationInputSchema>): Promise<z.infer<typeof AiShiftOptimizationOutputSchema>> {
  return aiShiftOptimizationFlow(input);
}

const aiShiftOptimizationPrompt = ai.definePrompt({
  name: 'aiShiftOptimizationPrompt',
  input: {schema: AiShiftOptimizationInputSchema},
  output: {schema: AiShiftOptimizationOutputSchema},
  prompt: `Sei l'assistente turni di TU.L.S. 
OBIETTIVO: Assegna i dipendenti agli slot orari in modo RAPIDO.

REGOLE TASSATIVE:
1. RIPOSO: Se un dipendente ha riposo il giorno X, non assegnarlo MAI in quel giorno.
2. DISTRIBUZIONE: Cerca di assegnare circa lo stesso numero di turni a tutti.
3. COPERTURA: Ogni slot (ID) deve avere 1 persona. Se ci sono più slot per lo stesso orario, assegna persone diverse.

Ignora le sedi. Restituisci solo l'array optimizedAssignments.

Dati:
Dipendenti: {{{json employees}}}
Slot: {{{json shifts}}}`,
});

const aiShiftOptimizationFlow = ai.defineFlow(
  {
    name: 'aiShiftOptimizationFlow',
    inputSchema: AiShiftOptimizationInputSchema,
    outputSchema: AiShiftOptimizationOutputSchema,
  },
  async (input) => {
    const {output} = await aiShiftOptimizationPrompt(input);
    if (!output) throw new Error('Errore generazione AI');
    return output;
  }
);
