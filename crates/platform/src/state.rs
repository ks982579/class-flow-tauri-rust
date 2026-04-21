use std::path::PathBuf;
use std::sync::Mutex;

use core::Workspace;

pub struct AppState {
    pub workspace: Mutex<Option<Workspace>>,
    pub save_path: Mutex<Option<PathBuf>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            workspace: Mutex::new(None),
            save_path: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
