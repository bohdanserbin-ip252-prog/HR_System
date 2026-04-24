use serde::{Serialize, Serializer};

#[derive(Debug, Clone)]
pub struct JsonNumber(pub f64);

impl Serialize for JsonNumber {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if self.0.is_finite()
            && self.0.fract() == 0.0
            && self.0 >= i64::MIN as f64
            && self.0 <= i64::MAX as f64
        {
            serializer.serialize_i64(self.0 as i64)
        } else {
            serializer.serialize_f64(self.0)
        }
    }
}

impl From<f64> for JsonNumber {
    fn from(value: f64) -> Self {
        Self(value)
    }
}
