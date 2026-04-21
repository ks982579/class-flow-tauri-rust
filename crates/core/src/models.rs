use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Modifier enums ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccessModifier {
    Public,
    Private,
    Protected,
}

impl Default for AccessModifier {
    fn default() -> Self {
        Self::Public
    }
}

// ── Class members ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub type_annotation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Property {
    pub id: Uuid,
    pub name: String,
    pub type_annotation: String,
    pub access: AccessModifier,
    pub immutable: bool,
    pub is_static: bool,
}

impl Property {
    pub fn new(name: impl Into<String>, type_annotation: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            type_annotation: type_annotation.into(),
            access: AccessModifier::default(),
            immutable: false,
            is_static: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Method {
    pub id: Uuid,
    pub name: String,
    pub parameters: Vec<Parameter>,
    pub return_type: Option<String>,
    pub access: AccessModifier,
    pub is_static: bool,
}

impl Method {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            parameters: Vec::new(),
            return_type: None,
            access: AccessModifier::default(),
            is_static: false,
        }
    }
}

// ── Class ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Class {
    pub id: Uuid,
    pub name: String,
    pub namespace_id: Uuid,
    pub properties: Vec<Property>,
    pub methods: Vec<Method>,
    pub nested_classes: Vec<Class>,
    /// True when this class represents free/global functions (user opt-in).
    pub is_global: bool,
}

impl Class {
    pub fn new(name: impl Into<String>, namespace_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            namespace_id,
            properties: Vec::new(),
            methods: Vec::new(),
            nested_classes: Vec::new(),
            is_global: false,
        }
    }

    pub fn add_property(&mut self, prop: Property) {
        self.properties.push(prop);
    }

    pub fn remove_property(&mut self, id: Uuid) {
        self.properties.retain(|p| p.id != id);
    }

    pub fn add_method(&mut self, method: Method) {
        self.methods.push(method);
    }

    pub fn remove_method(&mut self, id: Uuid) {
        self.methods.retain(|m| m.id != id);
    }
}

// ── Namespace ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Namespace {
    pub id: Uuid,
    pub name: String,
    pub classes: Vec<Class>,
}

impl Namespace {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            classes: Vec::new(),
        }
    }

    pub fn add_class(&mut self, class: Class) {
        self.classes.push(class);
    }

    pub fn remove_class(&mut self, id: Uuid) {
        self.classes.retain(|c| c.id != id);
    }

    pub fn class_mut(&mut self, id: Uuid) -> Option<&mut Class> {
        self.classes.iter_mut().find(|c| c.id == id)
    }
}

// ── Workflow ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MutationAction {
    Create,
    Update,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum StepKind {
    MethodCall {
        class_id: Uuid,
        method_id: Uuid,
    },
    ClassMutation {
        class_id: Uuid,
        action: MutationAction,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: Uuid,
    pub kind: StepKind,
}

impl WorkflowStep {
    pub fn new(kind: StepKind) -> Self {
        Self {
            id: Uuid::new_v4(),
            kind,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepEdge {
    pub from_step_id: Uuid,
    pub to_step_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: Uuid,
    pub name: String,
    pub steps: Vec<WorkflowStep>,
    pub edges: Vec<StepEdge>,
}

impl Workflow {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            steps: Vec::new(),
            edges: Vec::new(),
        }
    }

    pub fn add_step(&mut self, step: WorkflowStep) {
        self.steps.push(step);
    }

    pub fn remove_step(&mut self, id: Uuid) {
        self.steps.retain(|s| s.id != id);
        self.edges.retain(|e| e.from_step_id != id && e.to_step_id != id);
    }

    pub fn connect(&mut self, from_step_id: Uuid, to_step_id: Uuid) {
        self.edges.push(StepEdge { from_step_id, to_step_id });
    }

    pub fn disconnect(&mut self, from_step_id: Uuid, to_step_id: Uuid) {
        self.edges.retain(|e| !(e.from_step_id == from_step_id && e.to_step_id == to_step_id));
    }
}

// ── Workspace ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: Uuid,
    pub name: String,
    pub namespaces: Vec<Namespace>,
    pub workflows: Vec<Workflow>,
}

impl Workspace {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            namespaces: Vec::new(),
            workflows: Vec::new(),
        }
    }

    pub fn add_namespace(&mut self, ns: Namespace) {
        self.namespaces.push(ns);
    }

    pub fn remove_namespace(&mut self, id: Uuid) {
        self.namespaces.retain(|n| n.id != id);
    }

    pub fn namespace_mut(&mut self, id: Uuid) -> Option<&mut Namespace> {
        self.namespaces.iter_mut().find(|n| n.id == id)
    }

    pub fn add_workflow(&mut self, workflow: Workflow) {
        self.workflows.push(workflow);
    }

    pub fn remove_workflow(&mut self, id: Uuid) {
        self.workflows.retain(|w| w.id != id);
    }

    pub fn workflow_mut(&mut self, id: Uuid) -> Option<&mut Workflow> {
        self.workflows.iter_mut().find(|w| w.id == id)
    }

    /// Remove a class from whichever namespace owns it, and scrub all workflow
    /// steps that reference its methods.
    pub fn remove_class(&mut self, class_id: Uuid) {
        for ns in &mut self.namespaces {
            ns.remove_class(class_id);
        }
        for workflow in &mut self.workflows {
            let dead: Vec<Uuid> = workflow
                .steps
                .iter()
                .filter(|s| match &s.kind {
                    StepKind::MethodCall { class_id: cid, .. } => *cid == class_id,
                    StepKind::ClassMutation { class_id: cid, .. } => *cid == class_id,
                })
                .map(|s| s.id)
                .collect();
            for id in dead {
                workflow.remove_step(id);
            }
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_workspace() -> Workspace {
        let mut ws = Workspace::new("My Workspace");
        let mut ns = Namespace::new("App.Services");
        let mut cls = Class::new("UserService", ns.id);
        cls.add_method(Method::new("GetUser"));
        cls.add_method(Method::new("CreateUser"));
        cls.add_property(Property::new("repository", "IUserRepository"));
        ns.add_class(cls);
        ws.add_namespace(ns);
        ws
    }

    #[test]
    fn workspace_serialization_round_trip() {
        let ws = sample_workspace();
        let json = serde_json::to_string(&ws).unwrap();
        let restored: Workspace = serde_json::from_str(&json).unwrap();
        assert_eq!(ws.name, restored.name);
        assert_eq!(ws.namespaces.len(), restored.namespaces.len());
        let cls = &restored.namespaces[0].classes[0];
        assert_eq!(cls.methods.len(), 2);
        assert_eq!(cls.properties.len(), 1);
    }

    #[test]
    fn remove_class_scrubs_workflow_steps() {
        let mut ws = sample_workspace();
        let class_id = ws.namespaces[0].classes[0].id;
        let method_id = ws.namespaces[0].classes[0].methods[0].id;

        let mut wf = Workflow::new("Sign Up Flow");
        wf.add_step(WorkflowStep::new(StepKind::MethodCall { class_id, method_id }));
        ws.add_workflow(wf);

        assert_eq!(ws.workflows[0].steps.len(), 1);
        ws.remove_class(class_id);
        assert_eq!(ws.workflows[0].steps.len(), 0);
    }

    #[test]
    fn remove_step_cleans_edges() {
        let mut wf = Workflow::new("Flow");
        let s1 = WorkflowStep::new(StepKind::ClassMutation {
            class_id: Uuid::new_v4(),
            action: MutationAction::Create,
        });
        let s2 = WorkflowStep::new(StepKind::ClassMutation {
            class_id: Uuid::new_v4(),
            action: MutationAction::Update,
        });
        let id1 = s1.id;
        let id2 = s2.id;
        wf.add_step(s1);
        wf.add_step(s2);
        wf.connect(id1, id2);
        assert_eq!(wf.edges.len(), 1);
        wf.remove_step(id1);
        assert_eq!(wf.edges.len(), 0);
    }

    #[test]
    fn namespace_crud() {
        let mut ws = Workspace::new("WS");
        let ns = Namespace::new("Root");
        let ns_id = ns.id;
        ws.add_namespace(ns);
        assert_eq!(ws.namespaces.len(), 1);
        ws.remove_namespace(ns_id);
        assert_eq!(ws.namespaces.len(), 0);
    }

    #[test]
    fn global_class_flag() {
        let mut ns = Namespace::new("Scripts");
        let mut global = Class::new("Global", ns.id);
        global.is_global = true;
        ns.add_class(global);
        assert!(ns.classes[0].is_global);
    }
}
