use std::fmt;

#[derive(Debug)]
pub enum PlatformError {
    NotFound(String),
    NoWorkspace,
    Io(std::io::Error),
    Serialize(serde_json::Error),
}

impl fmt::Display for PlatformError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound(msg) => write!(f, "not found: {msg}"),
            Self::NoWorkspace => write!(f, "no workspace is loaded"),
            Self::Io(e) => write!(f, "io error: {e}"),
            Self::Serialize(e) => write!(f, "serialization error: {e}"),
        }
    }
}

impl From<std::io::Error> for PlatformError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<serde_json::Error> for PlatformError {
    fn from(e: serde_json::Error) -> Self {
        Self::Serialize(e)
    }
}

// Tauri commands return Result<T, String>
impl From<PlatformError> for String {
    fn from(e: PlatformError) -> Self {
        e.to_string()
    }
}
