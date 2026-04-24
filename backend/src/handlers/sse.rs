use crate::events::{Event, get_event_sender};
use axum::{
    extract::State,
    response::{Sse, sse::Event as SseEvent},
};
use futures_util::stream::Stream;
use std::{convert::Infallible, time::Duration};
use tokio_stream::StreamExt;
use tokio_stream::wrappers::BroadcastStream;

pub async fn events_stream(
    State(_state): State<crate::AppState>,
) -> Sse<impl Stream<Item = Result<SseEvent, Infallible>>> {
    let sender = get_event_sender();
    let rx = sender.subscribe();
    let stream = BroadcastStream::new(rx).filter_map(|result| match result {
        Ok(Event {
            event_type,
            payload,
        }) => {
            let data = match serde_json::to_string(&payload) {
                Ok(json) => json,
                Err(_) => return None,
            };
            Some(Ok(SseEvent::default().event(event_type).data(data)))
        }
        Err(_) => None,
    });

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text(""),
    )
}
