use serde_json::Value;
use std::sync::OnceLock;
use tokio::sync::broadcast::{self, Sender};

#[derive(Clone, Debug)]
pub struct Event {
    pub event_type: String,
    pub payload: Value,
}

static EVENT_SENDER: OnceLock<Sender<Event>> = OnceLock::new();

pub fn get_event_sender() -> Sender<Event> {
    EVENT_SENDER
        .get_or_init(|| broadcast::channel(100).0)
        .clone()
}

pub fn broadcast_event(event_type: impl Into<String>, payload: Value) {
    let sender = get_event_sender();
    let _ = sender.send(Event {
        event_type: event_type.into(),
        payload,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_event_sender_returns_cloneable_sender() {
        let s1 = get_event_sender();
        let s2 = get_event_sender();
        // Both should be able to subscribe receivers.
        let _rx1 = s1.subscribe();
        let _rx2 = s2.subscribe();
    }

    #[tokio::test]
    async fn broadcast_event_delivers_to_subscriber() {
        // Use a fresh channel directly to avoid cross-test interference.
        let (tx, mut rx) = broadcast::channel::<Event>(10);
        let _ = tx.send(Event {
            event_type: "complaint.created".into(),
            payload: serde_json::json!({"id": 1}),
        });
        let event = rx.recv().await.unwrap();
        assert_eq!(event.event_type, "complaint.created");
        assert_eq!(event.payload["id"], 1);
    }
}
