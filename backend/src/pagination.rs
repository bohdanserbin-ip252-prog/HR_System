use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub page: u32,
    pub per_page: u32,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum LegacyOrPaginated<T> {
    Paginated(PaginatedResponse<T>),
    Legacy(Vec<T>),
}

impl PaginationQuery {
    pub fn effective_page(&self) -> u32 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn effective_per_page(&self) -> u32 {
        self.per_page.unwrap_or(30).clamp(1, 100)
    }

    pub fn offset(&self) -> i64 {
        ((self.effective_page() - 1) * self.effective_per_page()) as i64
    }

    pub fn limit(&self) -> i64 {
        self.effective_per_page() as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_first_page_and_thirty_per_page() {
        let q = PaginationQuery {
            page: None,
            per_page: None,
        };
        assert_eq!(q.effective_page(), 1);
        assert_eq!(q.effective_per_page(), 30);
        assert_eq!(q.offset(), 0);
        assert_eq!(q.limit(), 30);
    }

    #[test]
    fn clamps_per_page_to_max_one_hundred() {
        let q = PaginationQuery {
            page: Some(1),
            per_page: Some(500),
        };
        assert_eq!(q.effective_per_page(), 100);
    }

    #[test]
    fn calculates_offset_for_page_two() {
        let q = PaginationQuery {
            page: Some(2),
            per_page: Some(20),
        };
        assert_eq!(q.offset(), 20);
    }
}
