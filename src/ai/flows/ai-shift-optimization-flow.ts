
'use server';
/**
 * @fileOverview Un flusso Genkit per ottimizzare l'assegnazione dei turni.
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
  roles: z.array(z.string()).describe('Lista dei ruoli.'),
  skills: z.array(z.string()).describe('Lista di competenze.'),
  availability: z.string().describe('Descrizione testuale della disponibilità e giorno di riposo.'),
});
export type Employee = z.infer<typeof EmployeeSchema>;

const ShiftSchema = z.object({
  id: z.string().describe('Identificativo unico per il turno.'),
  name: z.string().describe('Nome descrittivo del turno (es. "Palese Mattina").'),
  startTime: z.string().describe('Data e ora di inizio in formato ISO 8601.'),
  endTime: z.string().describe('Data e ora di fine in formato ISO 8601.'),
  requiredRoles: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  minCoverage: z.number().int().min(1),
  locationId: z.string().optional().describe('ID della sede associata al turno.'),
});
export type Shift = z.infer<typeof ShiftSchema>;

const AiShiftOptimizationInputSchema = z.object({
  employees: z.array(EmployeeSchema).describe('Lista dei dipendenti disponibili.'),
  shifts: z.array(ShiftSchema).describe('Lista dei turni da coprire (Mattina/Pomeriggio per Palese/Bisceglie).'),
});
export type AiShiftOptimizationInput = z.infer<typeof AiShiftOptimizationInputSchema>;

const OptimizedAssignmentSchema = z.object({
  shiftId: z.string().describe('L\'ID del turno assegnato.'),
  employeeId: z.string().describe('L\'ID del dipendente assegnato.'),
  justification: z.string().describe('Spiegazione della scelta.'),
});
export type OptimizedAssignment = z.infer<typeof OptimizedAssignmentSchema>;

const AiShiftOptimizationOutputSchema = z.object({
  optimizedAssignments: z.array(OptimizedAssignmentSchema).describe('Gli assegnamenti suggeriti.'),
  optimizationSummary: z.string().describe('Un riepilogo del processo.'),
});
export type AiShiftOptimizationOutput = z.infer<typeof AiShiftOptimizationOutputSchema>;

export async function aiShiftOptimization(input: AiShiftOptimizationInput): Promise<AiShiftOptimizationOutput> {
  return aiShiftOptimizationFlow(input);
}

const aiShiftOptimizationPrompt = ai.definePrompt({
  name: 'aiShiftOptimizationPrompt',
  input: {schema: AiShiftOptimizationInputSchema},
  output: {schema: AiShiftOptimizationOutputSchema},
  prompt: `Sei un esperto di gestione turni per l'azienda TU.L.S.
Il tuo obiettivo è assegnare i dipendenti ai turni settimanali (Mattina e Pomeriggio) per le sedi di PALESE e BISCEGLIE.

REGOLE CRITICHE:
1. RISPETTA I RIPOSI: Se un dipendente ha riposo mercoledì (3), non assegnarlo a nessun turno quel giorno.
2. COPERTURA: Ogni turno (Mattina/Pomeriggio per sede) deve avere almeno 1 persona.
3. EQUITÀ: Distribuisci i turni in modo equo rispettando le ore settimanali contrattuali.
4. EVITA SOVRAPPOSIZIONI: Un dipendente non può essere in due sedi contemporaneamente.

Dati:
Dipendenti: {{{json employees}}}
Turni da coprire: {{{json shifts}}}

Fornisci una 'justification' in italiano per ogni assegnamento.
Rispondi RIGOROSAMENTE nel formato JSON richiesto dallo schema.`,
});

const aiShiftOptimizationFlow = ai.defineFlow(
  {
    name: 'aiShiftOptimizationFlow',
    inputSchema: AiShiftOptimizationInputSchema,
    outputSchema: AiShiftOptimizationOutputSchema,
  },
  async (input) => {
    const {output} = await aiShiftOptimizationPrompt(input);
    if (!output) {
      throw new Error('Nessun output ricevuto dal prompt di ottimizzazione.');
    }
    return output;
  }
);
