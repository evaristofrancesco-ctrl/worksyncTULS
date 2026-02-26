'use server';
/**
 * @fileOverview Un flusso Genkit semplificato per ottimizzare l'assegnazione dei turni.
 *
 * - aiShiftOptimization - Una funzione che gestisce il processo di ottimizzazione dei turni tramite AI.
 * - AiShiftOptimizationInput - Il tipo di input per la funzione aiShiftOptimization.
 * - AiShiftOptimizationOutput - Il tipo di ritorno per la funzione aiShiftOptimization.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmployeeSchema = z.object({
  id: z.string().describe('Identificativo unico per il dipendente.'),
  name: z.string().describe('Nome completo del dipendente.'),
  availability: z.string().describe('Descrizione del giorno di riposo e ore contrattuali.'),
});
export type Employee = z.infer<typeof EmployeeSchema>;

const ShiftSchema = z.object({
  id: z.string().describe('Identificativo unico per lo slot.'),
  name: z.string().describe('Nome del turno (es. "Mattina").'),
  startTime: z.string().describe('ISO 8601.'),
  endTime: z.string().describe('ISO 8601.'),
});
export type Shift = z.infer<typeof ShiftSchema>;

const AiShiftOptimizationInputSchema = z.object({
  employees: z.array(EmployeeSchema).describe('Lista dei dipendenti.'),
  shifts: z.array(ShiftSchema).describe('Slot temporali da coprire.'),
});
export type AiShiftOptimizationInput = z.infer<typeof AiShiftOptimizationInputSchema>;

const OptimizedAssignmentSchema = z.object({
  shiftId: z.string().describe('ID dello slot.'),
  employeeId: z.string().describe('ID del dipendente.'),
});
export type OptimizedAssignment = z.infer<typeof OptimizedAssignmentSchema>;

const AiShiftOptimizationOutputSchema = z.object({
  optimizedAssignments: z.array(OptimizedAssignmentSchema),
});
export type AiShiftOptimizationOutput = z.infer<typeof AiShiftOptimizationOutputSchema>;

export async function aiShiftOptimization(input: AiShiftOptimizationInput): Promise<AiShiftOptimizationOutput> {
  return aiShiftOptimizationFlow(input);
}

const aiShiftOptimizationPrompt = ai.definePrompt({
  name: 'aiShiftOptimizationPrompt',
  input: {schema: AiShiftOptimizationInputSchema},
  output: {schema: AiShiftOptimizationOutputSchema},
  prompt: `Sei un assistente per la creazione dei turni di TU.L.S.
Il tuo compito è assegnare i dipendenti agli slot temporali indicati.

REGOLE SEMPLICI:
1. RISPETTA I RIPOSI: Non assegnare MAI un dipendente nel suo giorno di riposo indicato in 'availability'.
2. COPERTURA: Ogni slot deve avere almeno 1 o 2 persone assegnate (distribuisci equamente).
3. VELOCITÀ: Non preoccuparti delle sedi (Palese/Bisceglie), assegna solo le persone alle ore.

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
    if (!output) throw new Error('Nessun output ricevuto.');
    return output;
  }
);
