use serde_json::json;

pub fn paths() -> serde_json::Value {
    json!({
        "/api/v2/auth/login": {
            "post": {
                "summary": "Authenticate user",
                "tags": ["Auth"],
                "requestBody": {
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": { "$ref": "#/components/schemas/LoginPayload" }
                        }
                    }
                },
                "responses": {
                    "200": { "description": "Login successful" },
                    "400": { "description": "Invalid credentials" }
                }
            }
        },
        "/api/v2/auth/me": {
            "get": {
                "summary": "Get current authenticated user",
                "tags": ["Auth"],
                "responses": {
                    "200": { "description": "Current user" },
                    "401": { "description": "Unauthorized" }
                }
            }
        },
        "/api/v2/auth/logout": {
            "post": {
                "summary": "Logout current user",
                "tags": ["Auth"],
                "responses": {
                    "200": { "description": "Logout successful" }
                }
            }
        },
        "/api/v2/profile/me": {
            "get": {
                "summary": "Get canonical profile for the current user",
                "tags": ["Profile"],
                "responses": {
                    "200": { "description": "Current user profile aggregate" },
                    "401": { "description": "Unauthorized" }
                }
            }
        },
        "/api/v2/profile/{id}": {
            "get": {
                "summary": "Get canonical profile aggregate for an employee",
                "tags": ["Profile"],
                "responses": {
                    "200": { "description": "Employee profile aggregate" },
                    "403": { "description": "Forbidden" },
                    "404": { "description": "Employee not found" }
                }
            }
        },
        "/api/v2/activity": {
            "get": {
                "summary": "Get canonical activity timeline",
                "tags": ["Activity"],
                "responses": {
                    "200": { "description": "Activity timeline payload" },
                    "401": { "description": "Unauthorized" }
                }
            }
        },
        "/api/v2/employees": {
            "get": {
                "summary": "List employees",
                "tags": ["Employees"],
                "responses": { "200": { "description": "List of employees" } }
            },
            "post": {
                "summary": "Create employee",
                "tags": ["Employees"],
                "requestBody": {
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": { "$ref": "#/components/schemas/EmployeePayload" }
                        }
                    }
                },
                "responses": {
                    "201": { "description": "Employee created" },
                    "400": { "description": "Invalid payload" }
                }
            }
        },
        "/api/v2/complaints": {
            "get": {
                "summary": "List complaints",
                "tags": ["Complaints"],
                "responses": { "200": { "description": "List of complaints" } }
            },
            "post": {
                "summary": "Create complaint",
                "tags": ["Complaints"],
                "requestBody": {
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": { "$ref": "#/components/schemas/ComplaintPayload" }
                        }
                    }
                },
                "responses": {
                    "201": { "description": "Complaint created" },
                    "400": { "description": "Invalid payload" }
                }
            }
        },
        "/api/v2/organization/chart": {
            "get": {
                "summary": "Get canonical organization chart",
                "tags": ["Organization"],
                "responses": {
                    "200": { "description": "Organization chart data" },
                    "401": { "description": "Unauthorized" }
                }
            }
        },
        "/api/v2/time-off-requests": {
            "get": {
                "summary": "List time-off requests",
                "tags": ["Operations"],
                "responses": {
                    "200": { "description": "List of time-off requests" },
                    "401": { "description": "Unauthorized" }
                }
            },
            "post": {
                "summary": "Create a time-off request",
                "tags": ["Operations"],
                "responses": {
                    "201": { "description": "Time-off request created" },
                    "400": { "description": "Invalid payload" },
                    "401": { "description": "Unauthorized" }
                }
            }
        },
        "/api/v2/system/feature-flags": {
            "get": {
                "summary": "List system feature flags",
                "tags": ["System"],
                "responses": {
                    "200": { "description": "Feature flag list" },
                    "401": { "description": "Unauthorized" },
                    "403": { "description": "Forbidden" }
                }
            }
        },
        "/api/v2/system/feature-flags/{key}": {
            "get": {
                "summary": "Check a system feature flag",
                "tags": ["System"],
                "responses": {
                    "200": { "description": "Feature flag evaluation" },
                    "401": { "description": "Unauthorized" }
                }
            },
            "put": {
                "summary": "Update a system feature flag",
                "tags": ["System"],
                "responses": {
                    "200": { "description": "Feature flag updated" },
                    "401": { "description": "Unauthorized" },
                    "403": { "description": "Forbidden" }
                }
            }
        },
        "/api/v2/rbac/roles": {
            "get": {
                "summary": "List RBAC roles",
                "tags": ["RBAC"],
                "responses": {
                    "200": { "description": "RBAC roles" },
                    "401": { "description": "Unauthorized" },
                    "403": { "description": "Forbidden" }
                }
            }
        },
        "/api/v2/stats": {
            "get": {
                "summary": "Get dashboard statistics",
                "tags": ["Dashboard"],
                "responses": { "200": { "description": "Dashboard statistics" } }
            }
        },
        "/api/v2/audit": {
            "get": {
                "summary": "List audit events",
                "tags": ["Audit"],
                "responses": { "200": { "description": "List of audit events" } }
            }
        },
        "/api/v2/health": {
            "get": {
                "summary": "Health check",
                "tags": ["System"],
                "responses": { "200": { "description": "Service is healthy" } }
            }
        },
        "/api/v2/events": {
            "get": {
                "summary": "Server-Sent Events stream",
                "tags": ["System"],
                "responses": { "200": { "description": "SSE stream" } }
            }
        }
    })
}
