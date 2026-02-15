'use server';
/**
 * @fileOverview A Genkit flow for optimizing shift assignments.
 *
 * - aiShiftOptimization - A function that handles the AI-powered shift optimization process.
 * - AiShiftOptimizationInput - The input type for the aiShiftOptimization function.
 * - AiShiftOptimizationOutput - The return type for the aiShiftOptimization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmployeeSchema = z.object({
  id: z.string().describe('Unique identifier for the employee.'),
  name: z.string().describe('Full name of the employee.'),
  roles: z.array(z.string()).describe('List of roles the employee can perform (e.g., "Manager", "Cashier").'),
  skills: z.array(z.string()).describe('List of skills the employee possesses (e.g., "First Aid", "Forklift Certified").'),
  availability: z.string().describe('A free-text description of the employee\'s general availability (e.g., "Mon-Fri, 9am-5pm", "Weekends only").'),
});
export type Employee = z.infer<typeof EmployeeSchema>;

const ShiftSchema = z.object({
  id: z.string().describe('Unique identifier for the shift.'),
  name: z.string().describe('Descriptive name of the shift (e.g., "Morning Shift", "Evening Shift").'),
  startTime: z.string().datetime().describe('ISO 8601 formatted start datetime of the shift (e.g., "2023-10-27T08:00:00").'),
  endTime: z.string().datetime().describe('ISO 8601 formatted end datetime of the shift (e.g., "2023-10-27T16:00:00").'),
  requiredRoles: z.array(z.string()).describe('Roles required for this shift (e.g., ["Cashier", "Stocker"]).'),
  requiredSkills: z.array(z.string()).describe('Skills required for this shift (e.g., ["First Aid"]).'),
  minCoverage: z.number().int().min(1).describe('Minimum number of employees required for this shift.'),
});
export type Shift = z.infer<typeof ShiftSchema>;

const SpecificCoverageRequirementSchema = z.object({
  shiftId: z.string().describe('The ID of the shift this requirement applies to.'),
  role: z.string().describe('The specific role that needs a minimum count.'),
  count: z.number().int().min(1).describe('The minimum number of employees with this role required for the specified shift.'),
});
export type SpecificCoverageRequirement = z.infer<typeof SpecificCoverageRequirementSchema>;

export const AiShiftOptimizationInputSchema = z.object({
  employees: z.array(EmployeeSchema).describe('List of available employees with their details.'),
  shifts: z.array(ShiftSchema).describe('List of shifts that need to be filled.'),
  specificCoverageRequirements: z.array(SpecificCoverageRequirementSchema).optional().describe('Optional specific minimum coverage requirements per role for certain shifts.'),
});
export type AiShiftOptimizationInput = z.infer<typeof AiShiftOptimizationInputSchema>;

const OptimizedAssignmentSchema = z.object({
  shiftId: z.string().describe('The ID of the assigned shift.'),
  employeeId: z.string().describe('The ID of the employee assigned to the shift.'),
  justification: z.string().describe('A brief explanation of why this employee was assigned to this shift, considering roles, skills, and availability.'),
});
export type OptimizedAssignment = z.infer<typeof OptimizedAssignmentSchema>;

export const AiShiftOptimizationOutputSchema = z.object({
  optimizedAssignments: z.array(OptimizedAssignmentSchema).describe('The suggested optimized shift assignments.'),
  unassignedShifts: z.array(z.string()).describe('List of shift IDs that could not be assigned to any employee due to constraints.'),
  unassignedEmployees: z.array(z.string()).describe('List of employee IDs who were not assigned any shifts.'),
  optimizationSummary: z.string().describe('A summary of the optimization process, highlighting any challenges or specific considerations.'),
});
export type AiShiftOptimizationOutput = z.infer<typeof AiShiftOptimizationOutputSchema>;

export async function aiShiftOptimization(input: AiShiftOptimizationInput): Promise<AiShiftOptimizationOutput> {
  return aiShiftOptimizationFlow(input);
}

const aiShiftOptimizationPrompt = ai.definePrompt({
  name: 'aiShiftOptimizationPrompt',
  input: {schema: AiShiftOptimizationInputSchema},
  output: {schema: AiShiftOptimizationOutputSchema},
  prompt: `You are an expert workforce manager AI. Your task is to optimize shift assignments for a company based on employee details, shift requirements, and coverage rules.
Ensure that all assignments respect employee availability, roles, and skills. Prioritize filling all shifts while adhering to minimum coverage requirements.

Here is the data:

Employees:
{{{json employees}}}

Shifts to fill:
{{{json shifts}}}

Minimum specific coverage requirements (e.g., "at least 1 manager for shift X"):
{{#if specificCoverageRequirements}}
{{{json specificCoverageRequirements}}}
{{else}}
None specified.
{{/if}}

Constraints and Guidelines:
1. Each shift must meet its 'minCoverage' requirement.
2. Employees can only be assigned to shifts they are available for. Interpret 'availability' from the employee data.
3. Employees must possess all 'requiredRoles' and 'requiredSkills' for an assigned shift.
4. If 'specificCoverageRequirements' are provided, ensure those are met in addition to 'minCoverage'.
5. Avoid assigning an employee to overlapping shifts.
6. Provide a 'justification' for each assignment, explaining why that employee was chosen (e.g., "Employee has required role/skill and is available").

Provide the output in a JSON format matching the following structure:
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
      throw new Error('No output received from the AI shift optimization prompt.');
    }
    return output;
  }
);
