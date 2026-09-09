import { rollup } from '@falens/kernel';
import type { Severity } from '@falens/kernel';
import { z } from 'zod';
import type { Deps } from '../ports.ts';
import { countsSchema, flowSchema, matrixModuleSchema, moduleSchema, scopeSchema, severitySchema } from '../schemas.ts';

export const listModules = {
  name: 'list_modules',
  description: 'Every module installed for this company, in the order the drawer shows them.',
  input: z.object({ scope: scopeSchema }),
  output: z.object({ modules: z.array(moduleSchema) }),
  handler: async (_input: { scope: unknown }, deps: Deps) => ({ modules: await deps.modules.list() }),
};

export const listFlows = {
  name: 'list_flows',
  description: 'The flows a module carries, from the pack version installed for this company.',
  input: z.object({ scope: scopeSchema, module: z.string().min(1) }),
  output: z.object({ flows: z.array(flowSchema) }),
  handler: async (input: { module: string }, deps: Deps) => ({ flows: await deps.modules.flows(input.module) }),
};

export const getMatrix = {
  name: 'get_matrix',
  description: 'The company matrix: every module folded to the worst of its testing types.',
  input: z.object({ scope: scopeSchema }),
  output: z.object({ severity: severitySchema, counts: countsSchema, modules: z.array(matrixModuleSchema) }),
  handler: async (_input: { scope: unknown }, deps: Deps) => {
    const [modules, cells] = await Promise.all([deps.modules.list(), deps.verdicts.matrix()]);
    const folded = modules.map(module => {
      const types = cells
        .filter(c => c.module === module.id && c.testingType !== null)
        .map(c => ({ testingType: String(c.testingType), severity: c.severity as Severity }));
      // The fold is the kernel's, so the matrix, a module page and a run all agree on what worse means.
      return { module: module.id, severity: rollup(types).severity, types };
    });
    const company = rollup(folded);
    return { severity: company.severity, counts: company.counts, modules: folded };
  },
};
