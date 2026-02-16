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
  roles: z.array(z.string()).describe('Lista dei ruoli che il dipendente può ricoprire (es. "Manager", "Cassiere").'),
  skills: z.array(z.string()).describe('Lista di competenze possedute (es. "Primo Soccorso", "Certificato Carrello Elevatore").'),
  availability: z.string().describe('Descrizione testuale della disponibilità generale (es. "Lun-Ven, 9-17", "Solo weekend").'),
});
export type Employee = z.infer<typeof EmployeeSchema>;

const ShiftSchema = z.object({
  id: z.string().describe('Identificativo unico per il turno.'),
  name: z.string().describe('Nome descrittivo del turno (es. "Turno Mattutino").'),
  startTime: z.string().datetime().describe('Data e ora di inizio in formato ISO 8601.'),
  endTime: z.string().datetime().describe('Data e ora di fine in formato ISO 8601.'),
  requiredRoles: z.array(z.string()).describe('Ruoli richiesti per questo turno.'),
  requiredSkills: z.array(z.string()).describe('Competenze richieste per questo turno.'),
  minCoverage: z.number().int().min(1).describe('Numero minimo di dipendenti richiesti per questo turno.'),
});
export type Shift = z.infer<typeof ShiftSchema>;

const SpecificCoverageRequirementSchema = z.object({
  shiftId: z.string().describe('L\'ID del turno a cui si applica questo requisito.'),
  role: z.string().describe('Il ruolo specifico che richiede un conteggio minimo.'),
  count: z.number().int().min(1).describe('Il numero minimo di dipendenti con questo ruolo richiesti.'),
});
export type SpecificCoverageRequirement = z.infer<typeof SpecificCoverageRequirementSchema>;

const AiShiftOptimizationInputSchema = z.object({
  employees: z.array(EmployeeSchema).describe('Lista dei dipendenti disponibili con i loro dettagli.'),
  shifts: z.array(ShiftSchema).describe('Lista dei turni da coprire.'),
  specificCoverageRequirements: z.array(SpecificCoverageRequirementSchema).optional().describe('Requisiti opzionali di copertura minima per ruolo.'),
});
export type AiShiftOptimizationInput = z.infer<typeof AiShiftOptimizationInputSchema>;

const OptimizedAssignmentSchema = z.object({
  shiftId: z.string().describe('L\'ID del turno assegnato.'),
  employeeId: z.string().describe('L\'ID del dipendente assegnato.'),
  justification: z.string().describe('Una breve spiegazione del perché questo dipendente è stato scelto.'),
});
export type OptimizedAssignment = z.infer<typeof OptimizedAssignmentSchema>;

const AiShiftOptimizationOutputSchema = z.object({
  optimizedAssignments: z.array(OptimizedAssignmentSchema).describe('Gli assegnamenti suggeriti e ottimizzati.'),
  unassignedShifts: z.array(z.string()).describe('Lista degli ID dei turni che non è stato possibile coprire.'),
  unassignedEmployees: z.array(z.string()).describe('Lista degli ID dei dipendenti non assegnati a nessun turno.'),
  optimizationSummary: z.string().describe('Un riepilogo del processo di ottimizzazione.'),
});
export type AiShiftOptimizationOutput = z.infer<typeof AiShiftOptimizationOutputSchema>;

export async function aiShiftOptimization(input: AiShiftOptimizationInput): Promise<AiShiftOptimizationOutput> {
  return aiShiftOptimizationFlow(input);
}

const aiShiftOptimizationPrompt = ai.definePrompt({
  name: 'aiShiftOptimizationPrompt',
  input: {schema: AiShiftOptimizationInputSchema},
  output: {schema: AiShiftOptimizationOutputSchema},
  prompt: `Sei un esperto AI di gestione della forza lavoro. Il tuo compito è ottimizzare l'assegnazione dei turni per un'azienda chiamata TU.L.S. basandoti sui dettagli dei dipendenti e sui requisiti dei turni.
Assicurati che tutti gli assegnamenti rispettino la disponibilità, i ruoli e le competenze. Dai priorità alla copertura di tutti i turni.

Dati:

Dipendenti:
{{{json employees}}}

Turni da coprire:
{{{json shifts}}}

Requisiti specifici:
{{#if specificCoverageRequirements}}
{{{json specificCoverageRequirements}}}
{{else}}
Nessuno specificato.
{{/if}}

Linee guida:
1. Ogni turno deve soddisfare il suo 'minCoverage'.
2. I dipendenti possono essere assegnati solo se disponibili.
3. Evita sovrapposizioni di turni per lo stesso dipendente.
4. Fornisci una 'justification' per ogni scelta in lingua italiana.

Rispondi in formato JSON seguendo questo schema:
{{json output.schema}}`,
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
