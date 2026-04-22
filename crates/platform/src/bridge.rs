use core::{Class, Method, MethodStep, MethodStepConnection, Namespace, Property, StepKind, Workflow, WorkflowStep, Workspace};
use uuid::Uuid;

use crate::error::PlatformError;

pub type BridgeResult<T> = Result<T, PlatformError>;

/// All domain mutations expressed as pure operations on a `&mut Workspace`.
/// No I/O — persistence is handled by the command layer.
/// If the UI framework changes, only the command layer changes; this trait stays.
pub trait PlatformBridge {
    fn add_namespace(&self, ws: &mut Workspace, name: String) -> BridgeResult<Namespace>;
    fn remove_namespace(&self, ws: &mut Workspace, id: Uuid) -> BridgeResult<()>;
    fn rename_namespace(&self, ws: &mut Workspace, id: Uuid, name: String) -> BridgeResult<()>;

    fn add_class(
        &self,
        ws: &mut Workspace,
        namespace_id: Uuid,
        name: String,
        is_global: bool,
    ) -> BridgeResult<Class>;
    fn remove_class(&self, ws: &mut Workspace, class_id: Uuid) -> BridgeResult<()>;
    fn replace_class(&self, ws: &mut Workspace, class: Class) -> BridgeResult<Class>;

    fn add_workflow(&self, ws: &mut Workspace, name: String) -> BridgeResult<Workflow>;
    fn remove_workflow(&self, ws: &mut Workspace, id: Uuid) -> BridgeResult<()>;
    fn rename_workflow(&self, ws: &mut Workspace, id: Uuid, name: String) -> BridgeResult<()>;

    fn add_step(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        kind: StepKind,
    ) -> BridgeResult<WorkflowStep>;
    fn remove_step(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()>;
    fn connect_steps(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_step_id: Uuid,
        to_step_id: Uuid,
    ) -> BridgeResult<()>;
    fn disconnect_steps(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_step_id: Uuid,
        to_step_id: Uuid,
    ) -> BridgeResult<()>;

    /// Find-or-create a MethodCall step for each endpoint, then connect them.
    /// Reuses an existing step when the same class+method is already in the workflow,
    /// so multiple edges can fan out from a single step node.
    fn connect_methods(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_class_id: Uuid,
        from_method_id: Uuid,
        to_class_id: Uuid,
        to_method_id: Uuid,
    ) -> BridgeResult<()>;

    fn add_property(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        prop: Property,
    ) -> BridgeResult<()>;
    fn remove_property(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        property_id: Uuid,
    ) -> BridgeResult<()>;

    fn add_method(&self, ws: &mut Workspace, class_id: Uuid, method: Method)
    -> BridgeResult<()>;
    fn remove_method(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
    ) -> BridgeResult<()>;

    fn add_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        statement: String,
    ) -> BridgeResult<MethodStep>;
    fn update_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
        statement: String,
    ) -> BridgeResult<()>;
    fn remove_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()>;
    fn set_method_step_connection(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
        target_class_id: Uuid,
        target_method_id: Uuid,
    ) -> BridgeResult<()>;
    fn clear_method_step_connection(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn find_or_create_method_step(wf: &mut core::Workflow, class_id: Uuid, method_id: Uuid) -> Uuid {
    if let Some(existing) = wf.steps.iter().find(|s| {
        matches!(&s.kind, StepKind::MethodCall { class_id: cid, method_id: mid }
            if *cid == class_id && *mid == method_id)
    }) {
        return existing.id;
    }
    let step = WorkflowStep::new(StepKind::MethodCall { class_id, method_id });
    let id = step.id;
    wf.add_step(step);
    id
}

// ── Default implementation ────────────────────────────────────────────────────

pub struct CoreBridge;

impl CoreBridge {
    fn find_class_mut<'a>(
        ws: &'a mut Workspace,
        class_id: Uuid,
    ) -> BridgeResult<&'a mut Class> {
        ws.namespaces
            .iter_mut()
            .flat_map(|n| n.classes.iter_mut())
            .find(|c| c.id == class_id)
            .ok_or_else(|| PlatformError::NotFound(format!("class {class_id}")))
    }
}

impl PlatformBridge for CoreBridge {
    fn add_namespace(&self, ws: &mut Workspace, name: String) -> BridgeResult<Namespace> {
        let ns = Namespace::new(name);
        let clone = ns.clone();
        ws.add_namespace(ns);
        Ok(clone)
    }

    fn remove_namespace(&self, ws: &mut Workspace, id: Uuid) -> BridgeResult<()> {
        ws.remove_namespace(id);
        Ok(())
    }

    fn rename_namespace(&self, ws: &mut Workspace, id: Uuid, name: String) -> BridgeResult<()> {
        ws.namespace_mut(id)
            .ok_or_else(|| PlatformError::NotFound(format!("namespace {id}")))?
            .name = name;
        Ok(())
    }

    fn add_class(
        &self,
        ws: &mut Workspace,
        namespace_id: Uuid,
        name: String,
        is_global: bool,
    ) -> BridgeResult<Class> {
        let mut cls = Class::new(name, namespace_id);
        cls.is_global = is_global;
        let clone = cls.clone();
        ws.namespace_mut(namespace_id)
            .ok_or_else(|| PlatformError::NotFound(format!("namespace {namespace_id}")))?
            .add_class(cls);
        Ok(clone)
    }

    fn remove_class(&self, ws: &mut Workspace, class_id: Uuid) -> BridgeResult<()> {
        ws.remove_class(class_id);
        Ok(())
    }

    fn replace_class(&self, ws: &mut Workspace, class: Class) -> BridgeResult<Class> {
        let ns = ws
            .namespaces
            .iter_mut()
            .find(|n| n.classes.iter().any(|c| c.id == class.id))
            .ok_or_else(|| PlatformError::NotFound(format!("class {}", class.id)))?;
        let slot = ns
            .classes
            .iter_mut()
            .find(|c| c.id == class.id)
            .unwrap();
        *slot = class.clone();
        Ok(class)
    }

    fn add_workflow(&self, ws: &mut Workspace, name: String) -> BridgeResult<Workflow> {
        let wf = Workflow::new(name);
        let clone = wf.clone();
        ws.add_workflow(wf);
        Ok(clone)
    }

    fn remove_workflow(&self, ws: &mut Workspace, id: Uuid) -> BridgeResult<()> {
        ws.remove_workflow(id);
        Ok(())
    }

    fn rename_workflow(&self, ws: &mut Workspace, id: Uuid, name: String) -> BridgeResult<()> {
        ws.workflow_mut(id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {id}")))?
            .name = name;
        Ok(())
    }

    fn add_step(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        kind: StepKind,
    ) -> BridgeResult<WorkflowStep> {
        let step = WorkflowStep::new(kind);
        let clone = step.clone();
        ws.workflow_mut(workflow_id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {workflow_id}")))?
            .add_step(step);
        Ok(clone)
    }

    fn remove_step(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()> {
        ws.workflow_mut(workflow_id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {workflow_id}")))?
            .remove_step(step_id);
        Ok(())
    }

    fn connect_steps(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_step_id: Uuid,
        to_step_id: Uuid,
    ) -> BridgeResult<()> {
        ws.workflow_mut(workflow_id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {workflow_id}")))?
            .connect(from_step_id, to_step_id);
        Ok(())
    }

    fn disconnect_steps(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_step_id: Uuid,
        to_step_id: Uuid,
    ) -> BridgeResult<()> {
        ws.workflow_mut(workflow_id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {workflow_id}")))?
            .disconnect(from_step_id, to_step_id);
        Ok(())
    }

    fn connect_methods(
        &self,
        ws: &mut Workspace,
        workflow_id: Uuid,
        from_class_id: Uuid,
        from_method_id: Uuid,
        to_class_id: Uuid,
        to_method_id: Uuid,
    ) -> BridgeResult<()> {
        let wf = ws.workflow_mut(workflow_id)
            .ok_or_else(|| PlatformError::NotFound(format!("workflow {workflow_id}")))?;

        let from_id = find_or_create_method_step(wf, from_class_id, from_method_id);
        let to_id   = find_or_create_method_step(wf, to_class_id, to_method_id);
        wf.connect(from_id, to_id);
        Ok(())
    }

    fn add_property(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        prop: Property,
    ) -> BridgeResult<()> {
        Self::find_class_mut(ws, class_id)?.add_property(prop);
        Ok(())
    }

    fn remove_property(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        property_id: Uuid,
    ) -> BridgeResult<()> {
        Self::find_class_mut(ws, class_id)?.remove_property(property_id);
        Ok(())
    }

    fn add_method(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method: Method,
    ) -> BridgeResult<()> {
        Self::find_class_mut(ws, class_id)?.add_method(method);
        Ok(())
    }

    fn remove_method(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
    ) -> BridgeResult<()> {
        Self::find_class_mut(ws, class_id)?.remove_method(method_id);
        Ok(())
    }

    fn add_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        statement: String,
    ) -> BridgeResult<MethodStep> {
        let step = ws
            .find_method_mut(class_id, method_id)
            .ok_or_else(|| PlatformError::NotFound(format!("method {method_id}")))?
            .add_step(statement);
        Ok(step)
    }

    fn update_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
        statement: String,
    ) -> BridgeResult<()> {
        ws.find_method_mut(class_id, method_id)
            .ok_or_else(|| PlatformError::NotFound(format!("method {method_id}")))?
            .step_mut(step_id)
            .ok_or_else(|| PlatformError::NotFound(format!("step {step_id}")))?
            .statement = statement;
        Ok(())
    }

    fn remove_method_step(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()> {
        ws.find_method_mut(class_id, method_id)
            .ok_or_else(|| PlatformError::NotFound(format!("method {method_id}")))?
            .remove_step(step_id);
        Ok(())
    }

    fn set_method_step_connection(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
        target_class_id: Uuid,
        target_method_id: Uuid,
    ) -> BridgeResult<()> {
        ws.find_method_mut(class_id, method_id)
            .ok_or_else(|| PlatformError::NotFound(format!("method {method_id}")))?
            .step_mut(step_id)
            .ok_or_else(|| PlatformError::NotFound(format!("step {step_id}")))?
            .connection = Some(MethodStepConnection { class_id: target_class_id, method_id: target_method_id });
        Ok(())
    }

    fn clear_method_step_connection(
        &self,
        ws: &mut Workspace,
        class_id: Uuid,
        method_id: Uuid,
        step_id: Uuid,
    ) -> BridgeResult<()> {
        ws.find_method_mut(class_id, method_id)
            .ok_or_else(|| PlatformError::NotFound(format!("method {method_id}")))?
            .step_mut(step_id)
            .ok_or_else(|| PlatformError::NotFound(format!("step {step_id}")))?
            .connection = None;
        Ok(())
    }
}
