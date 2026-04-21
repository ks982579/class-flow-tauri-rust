export type AccessModifier = 'public' | 'private' | 'protected';
export type MutationAction = 'create' | 'update';

export interface Parameter {
  name: string;
  typeAnnotation: string;
}

export interface Property {
  id: string;
  name: string;
  typeAnnotation: string;
  access: AccessModifier;
  immutable: boolean;
  isStatic: boolean;
}

export interface Method {
  id: string;
  name: string;
  parameters: Parameter[];
  returnType: string | null;
  access: AccessModifier;
  isStatic: boolean;
}

export interface Class {
  id: string;
  name: string;
  namespaceId: string;
  properties: Property[];
  methods: Method[];
  nestedClasses: Class[];
  isGlobal: boolean;
}

export interface Namespace {
  id: string;
  name: string;
  classes: Class[];
}

export type StepKind =
  | { kind: 'methodCall';    classId: string; methodId: string }
  | { kind: 'classMutation'; classId: string; action: MutationAction };

export interface WorkflowStep {
  id: string;
  kind: StepKind;
}

export interface StepEdge {
  fromStepId: string;
  toStepId: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  edges: StepEdge[];
}

export interface Workspace {
  id: string;
  name: string;
  namespaces: Namespace[];
  workflows: Workflow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function accessSymbol(a: AccessModifier): string {
  return a === 'public' ? '+' : a === 'private' ? '-' : '#';
}

export function formatMethodSignature(m: Method): string {
  const params = m.parameters.map(p => `${p.name}: ${p.typeAnnotation}`).join(', ');
  const ret = m.returnType ? `: ${m.returnType}` : '';
  return `(${params})${ret}`;
}
