import { invoke } from '@tauri-apps/api/core';
import type { Class, Method, Property, StepKind, Workspace } from './types';

export const api = {
  newWorkspace:    (name: string) =>
    invoke<Workspace>('new_workspace', { name }),

  loadWorkspace:   (path: string) =>
    invoke<Workspace>('load_workspace', { path }),

  saveWorkspace:   (path?: string) =>
    invoke<void>('save_workspace', { path: path ?? null }),

  getWorkspace:    () =>
    invoke<Workspace>('get_workspace'),

  addNamespace:    (name: string) =>
    invoke<Workspace>('add_namespace', { name }),

  removeNamespace: (id: string) =>
    invoke<Workspace>('remove_namespace', { id }),

  renameNamespace: (id: string, name: string) =>
    invoke<Workspace>('rename_namespace', { id, name }),

  addClass:        (namespaceId: string, name: string, isGlobal: boolean) =>
    invoke<Workspace>('add_class', { namespaceId, name, isGlobal }),

  removeClass:     (classId: string) =>
    invoke<Workspace>('remove_class', { classId }),

  replaceClass:    (cls: Class) =>
    invoke<Workspace>('replace_class', { class: cls }),

  addProperty:     (classId: string, prop: Property) =>
    invoke<Workspace>('add_property', { classId, prop }),

  removeProperty:  (classId: string, propertyId: string) =>
    invoke<Workspace>('remove_property', { classId, propertyId }),

  addMethod:       (classId: string, method: Method) =>
    invoke<Workspace>('add_method', { classId, method }),

  removeMethod:    (classId: string, methodId: string) =>
    invoke<Workspace>('remove_method', { classId, methodId }),

  addWorkflow:     (name: string) =>
    invoke<Workspace>('add_workflow', { name }),

  removeWorkflow:  (id: string) =>
    invoke<Workspace>('remove_workflow', { id }),

  renameWorkflow:  (id: string, name: string) =>
    invoke<Workspace>('rename_workflow', { id, name }),

  addStep:         (workflowId: string, kind: StepKind) =>
    invoke<Workspace>('add_step', { workflowId, kind }),

  removeStep:      (workflowId: string, stepId: string) =>
    invoke<Workspace>('remove_step', { workflowId, stepId }),

  connectSteps:    (workflowId: string, fromStepId: string, toStepId: string) =>
    invoke<Workspace>('connect_steps', { workflowId, fromStepId, toStepId }),

  disconnectSteps: (workflowId: string, fromStepId: string, toStepId: string) =>
    invoke<Workspace>('disconnect_steps', { workflowId, fromStepId, toStepId }),
};
