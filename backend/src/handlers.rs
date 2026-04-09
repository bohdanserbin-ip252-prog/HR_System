use crate::{
    AppState,
    auth::{self, build_logout_cookie, build_session_cookie},
    db,
    error::{AppError, AppResult},
    models::{
        DepartmentPayload, DevelopmentFeedbackPayload, DevelopmentGoalPayload,
        DevelopmentMeetingPayload, DevelopmentResponse, EmployeePayload, EmployeesQuery,
        LoginPayload, LoginResponse, MovePayload, OnboardingResponse, OnboardingTaskPayload,
        PositionPayload, SuccessResponse, is_valid_date, is_valid_email,
    },
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use axum_extra::extract::cookie::CookieJar;
use serde_json::Value;

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(CookieJar, Json<LoginResponse>)> {
    let login = LoginPayload::from_json(&payload);
    let username = login.username;
    let password = login.password;
    let user = state
        .run_db(move |conn| {
            db::authenticate_user(conn, &username, &password)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match user {
        Some(user) => {
            let user_id = user.id;
            let token = state
                .run_db(move |conn| {
                    db::create_session(conn, user_id)
                        .map_err(|err| AppError::internal(err.to_string()))
                })
                .await?;
            let cookie = build_session_cookie(token);
            Ok((jar.add(cookie), Json(LoginResponse { success: true, user })))
        }
        None => Err(AppError::unauthorized("Невірний логін або пароль")),
    }
}

pub async fn me(State(state): State<AppState>, jar: CookieJar) -> AppResult<Json<crate::models::User>> {
    let user = auth::require_authenticated(&state, &jar).await?;
    Ok(Json(user))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<SuccessResponse>)> {
    if let Some(token) = auth::session_token_from_jar(&jar) {
        state
            .run_db(move |conn| {
                db::delete_session(conn, &token)
                    .map(|_| ())
                    .map_err(|err| AppError::internal(err.to_string()))
            })
            .await?;
    }

    Ok((
        jar.add(build_logout_cookie()),
        Json(SuccessResponse { success: true }),
    ))
}

pub async fn stats(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<crate::models::StatsResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let stats = state
        .run_db(|conn| db::fetch_stats(conn).map_err(|err| AppError::internal(err.to_string())))
        .await?;
    Ok(Json(stats))
}

pub async fn development(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<DevelopmentResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let response = state
        .run_db(|conn| {
            db::fetch_development(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(response))
}

pub async fn onboarding(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<OnboardingResponse>> {
    auth::require_authenticated(&state, &jar).await?;
    let response = state
        .run_db(|conn| {
            db::fetch_onboarding(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(response))
}

pub async fn create_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentGoal>)> {
    auth::require_admin(&state, &jar).await?;
    let goal = DevelopmentGoalPayload::from_json(&payload);
    validate_development_goal(&goal)?;

    let created = state
        .run_db(move |conn| {
            db::create_development_goal(conn, &goal)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::DevelopmentGoal>> {
    auth::require_admin(&state, &jar).await?;
    let goal = DevelopmentGoalPayload::from_json(&payload);
    validate_development_goal(&goal)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_development_goal(conn, &id, &goal)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Ціль розвитку не знайдена"));
            }

            db::get_development_goal(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Ціль розвитку не знайдена"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_development_goal(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Ціль розвитку не знайдена"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn move_development_goal(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let move_payload = MovePayload::from_json(&payload);
    validate_move_payload(&move_payload)?;

    state.run_db(move |conn| {
        if db::get_development_goal(conn, &id)
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
        {
            return Err(AppError::not_found("Ціль розвитку не знайдена"));
        }

        db::move_development_goal(conn, &id, &move_payload.direction)
            .map_err(|err| AppError::internal(err.to_string()))?;
        Ok(())
    })
    .await?;

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn create_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentFeedback>)> {
    auth::require_admin(&state, &jar).await?;
    let feedback = DevelopmentFeedbackPayload::from_json(&payload);
    validate_development_feedback(&feedback)?;

    let created = state
        .run_db(move |conn| {
            db::create_development_feedback(conn, &feedback)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::DevelopmentFeedback>> {
    auth::require_admin(&state, &jar).await?;
    let feedback = DevelopmentFeedbackPayload::from_json(&payload);
    validate_development_feedback(&feedback)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_development_feedback(conn, &id, &feedback)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Відгук не знайдено"));
            }

            db::get_development_feedback(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Відгук не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_development_feedback(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Відгук не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn move_development_feedback(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let move_payload = MovePayload::from_json(&payload);
    validate_move_payload(&move_payload)?;

    state.run_db(move |conn| {
        if db::get_development_feedback(conn, &id)
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
        {
            return Err(AppError::not_found("Відгук не знайдено"));
        }

        db::move_development_feedback(conn, &id, &move_payload.direction)
            .map_err(|err| AppError::internal(err.to_string()))?;
        Ok(())
    })
    .await?;

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn create_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::DevelopmentMeeting>)> {
    auth::require_admin(&state, &jar).await?;
    let meeting = DevelopmentMeetingPayload::from_json(&payload);
    validate_development_meeting(&meeting)?;

    let created = state
        .run_db(move |conn| {
            db::create_development_meeting(conn, &meeting)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::DevelopmentMeeting>> {
    auth::require_admin(&state, &jar).await?;
    let meeting = DevelopmentMeetingPayload::from_json(&payload);
    validate_development_meeting(&meeting)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_development_meeting(conn, &id, &meeting)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Зустріч не знайдено"));
            }

            db::get_development_meeting(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Зустріч не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_development_meeting(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Зустріч не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn move_development_meeting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let move_payload = MovePayload::from_json(&payload);
    validate_move_payload(&move_payload)?;

    state.run_db(move |conn| {
        if db::get_development_meeting(conn, &id)
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
        {
            return Err(AppError::not_found("Зустріч не знайдено"));
        }

        db::move_development_meeting(conn, &id, &move_payload.direction)
            .map_err(|err| AppError::internal(err.to_string()))?;
        Ok(())
    })
    .await?;

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn create_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::OnboardingTask>)> {
    auth::require_admin(&state, &jar).await?;
    let task = OnboardingTaskPayload::from_json(&payload);
    validate_onboarding_task(&task)?;

    let created = state
        .run_db(move |conn| {
            db::create_onboarding_task(conn, &task)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::OnboardingTask>> {
    auth::require_admin(&state, &jar).await?;
    let task = OnboardingTaskPayload::from_json(&payload);
    validate_onboarding_task(&task)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_onboarding_task(conn, &id, &task)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Onboarding-задачу не знайдено"));
            }

            db::get_onboarding_task(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Onboarding-задачу не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_onboarding_task(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Onboarding-задачу не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn move_onboarding_task(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let move_payload = MovePayload::from_json(&payload);
    validate_move_payload(&move_payload)?;

    state.run_db(move |conn| {
        if db::get_onboarding_task(conn, &id)
            .map_err(|err| AppError::internal(err.to_string()))?
            .is_none()
        {
            return Err(AppError::not_found("Onboarding-задачу не знайдено"));
        }

        db::move_onboarding_task(conn, &id, &move_payload.direction)
            .map_err(|err| AppError::internal(err.to_string()))?;
        Ok(())
    })
    .await?;

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn list_employees(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(query): Query<EmployeesQuery>,
) -> AppResult<Json<Vec<crate::models::EmployeeWithNames>>> {
    auth::require_authenticated(&state, &jar).await?;
    let employees = state
        .run_db(move |conn| {
            db::list_employees(conn, &query).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(employees))
}

pub async fn get_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::EmployeeWithNames>> {
    auth::require_authenticated(&state, &jar).await?;
    let employee = state
        .run_db(move |conn| {
            db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match employee {
        Some(employee) => Ok(Json(employee)),
        None => Err(AppError::not_found("Працівника не знайдено")),
    }
}

pub async fn create_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::Employee>)> {
    auth::require_admin(&state, &jar).await?;
    let employee = EmployeePayload::from_json(&payload);
    validate_employee(&employee)?;

    let created = state
        .run_db(move |conn| {
            db::create_employee(conn, &employee)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::EmployeeWithNames>> {
    auth::require_admin(&state, &jar).await?;
    let employee = EmployeePayload::from_json(&payload);
    validate_employee(&employee)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_employee(conn, &id, &employee)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Працівника не знайдено"));
            }

            db::get_employee_with_names(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Працівника не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_employee(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_employee(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Працівника не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn list_departments(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Vec<crate::models::DepartmentWithCount>>> {
    auth::require_authenticated(&state, &jar).await?;
    let departments = state
        .run_db(|conn| {
            db::list_departments(conn).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;
    Ok(Json(departments))
}

pub async fn get_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::Department>> {
    auth::require_authenticated(&state, &jar).await?;
    let department = state
        .run_db(move |conn| {
            db::get_department(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match department {
        Some(department) => Ok(Json(department)),
        None => Err(AppError::not_found("Відділ не знайдено")),
    }
}

pub async fn create_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::Department>)> {
    auth::require_admin(&state, &jar).await?;
    let department = DepartmentPayload::from_json(&payload);
    validate_department(&department)?;

    let created = state
        .run_db(move |conn| {
            db::create_department(conn, &department)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::Department>> {
    auth::require_admin(&state, &jar).await?;
    let department = DepartmentPayload::from_json(&payload);
    validate_department(&department)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_department(conn, &id, &department)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Відділ не знайдено"));
            }

            db::get_department(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Відділ не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_department(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_department(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Відділ не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

pub async fn list_positions(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<Json<Vec<crate::models::PositionWithCount>>> {
    auth::require_authenticated(&state, &jar).await?;
    let positions = state
        .run_db(|conn| db::list_positions(conn).map_err(|err| AppError::internal(err.to_string())))
        .await?;
    Ok(Json(positions))
}

pub async fn get_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<crate::models::Position>> {
    auth::require_authenticated(&state, &jar).await?;
    let position = state
        .run_db(move |conn| {
            db::get_position(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    match position {
        Some(position) => Ok(Json(position)),
        None => Err(AppError::not_found("Посаду не знайдено")),
    }
}

pub async fn create_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<Value>,
) -> AppResult<(StatusCode, Json<crate::models::Position>)> {
    auth::require_admin(&state, &jar).await?;
    let position = PositionPayload::from_json(&payload);
    validate_position(&position)?;

    let created = state
        .run_db(move |conn| {
            db::create_position(conn, &position)
                .map_err(|err| AppError::bad_request(err.to_string()))
        })
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
    Json(payload): Json<Value>,
) -> AppResult<Json<crate::models::Position>> {
    auth::require_admin(&state, &jar).await?;
    let position = PositionPayload::from_json(&payload);
    validate_position(&position)?;

    let updated = state
        .run_db(move |conn| {
            let changes = db::update_position(conn, &id, &position)
                .map_err(|err| AppError::bad_request(err.to_string()))?;
            if changes == 0 {
                return Err(AppError::not_found("Посаду не знайдено"));
            }

            db::get_position(conn, &id)
                .map_err(|err| AppError::internal(err.to_string()))?
                .ok_or_else(|| AppError::not_found("Посаду не знайдено"))
        })
        .await?;

    Ok(Json(updated))
}

pub async fn delete_position(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(id): Path<String>,
) -> AppResult<Json<SuccessResponse>> {
    auth::require_admin(&state, &jar).await?;
    let deleted = state
        .run_db(move |conn| {
            db::delete_position(conn, &id).map_err(|err| AppError::internal(err.to_string()))
        })
        .await?;

    if deleted == 0 {
        return Err(AppError::not_found("Посаду не знайдено"));
    }

    Ok(Json(SuccessResponse { success: true }))
}

fn validate_employee(employee: &EmployeePayload) -> AppResult<()> {
    if employee.first_name.is_empty()
        || employee.last_name.is_empty()
        || employee.hire_date.is_empty()
    {
        return Err(AppError::bad_request(
            "Ім'я, прізвище та дата прийому обов'язкові",
        ));
    }

    if !is_valid_email(employee.email.as_deref()) {
        return Err(AppError::bad_request("Некоректний email"));
    }

    if employee.salary < 0.0 {
        return Err(AppError::bad_request("Зарплата не може бути від’ємною"));
    }

    Ok(())
}

fn validate_department(department: &DepartmentPayload) -> AppResult<()> {
    if department.name.is_empty() {
        return Err(AppError::bad_request("Назва обов'язкова"));
    }

    Ok(())
}

fn validate_position(position: &PositionPayload) -> AppResult<()> {
    if position.title.is_empty() {
        return Err(AppError::bad_request("Назва обов'язкова"));
    }

    if position.min_salary < 0.0 || position.max_salary < 0.0 {
        return Err(AppError::bad_request("Зарплата не може бути від’ємною"));
    }

    if position.max_salary < position.min_salary {
        return Err(AppError::bad_request(
            "Максимальна зарплата не може бути меншою за мінімальну",
        ));
    }

    Ok(())
}

fn validate_development_goal(goal: &DevelopmentGoalPayload) -> AppResult<()> {
    if goal.icon.is_empty() || goal.title.is_empty() || goal.desc.is_empty() {
        return Err(AppError::bad_request(
            "Іконка, назва та опис цілі обов'язкові",
        ));
    }

    if !matches!(goal.status.as_str(), "in-progress" | "on-track" | "completed") {
        return Err(AppError::bad_request("Некоректний статус цілі"));
    }

    if goal.progress < 0.0 || goal.progress > 100.0 {
        return Err(AppError::bad_request("Прогрес має бути в межах від 0 до 100"));
    }

    if !is_valid_date(goal.due_date.as_deref()) {
        return Err(AppError::bad_request("Дата дедлайну має бути у форматі YYYY-MM-DD"));
    }

    Ok(())
}

fn validate_development_feedback(feedback: &DevelopmentFeedbackPayload) -> AppResult<()> {
    if feedback.text.is_empty() {
        return Err(AppError::bad_request("Текст відгуку обов'язковий"));
    }

    if !is_valid_date(Some(feedback.feedback_at.as_str())) {
        return Err(AppError::bad_request("Дата відгуку має бути у форматі YYYY-MM-DD"));
    }

    Ok(())
}

fn validate_development_meeting(meeting: &DevelopmentMeetingPayload) -> AppResult<()> {
    if meeting.title.is_empty() || meeting.meeting_type.is_empty() {
        return Err(AppError::bad_request("Назва та тип зустрічі обов'язкові"));
    }

    if !is_valid_date(Some(meeting.date.as_str())) {
        return Err(AppError::bad_request("Дата зустрічі має бути у форматі YYYY-MM-DD"));
    }

    Ok(())
}

fn validate_onboarding_task(task: &OnboardingTaskPayload) -> AppResult<()> {
    if task.icon.is_empty() || task.title.is_empty() || task.desc.is_empty() {
        return Err(AppError::bad_request(
            "Іконка, назва та опис onboarding-задачі обов'язкові",
        ));
    }

    if !matches!(task.status.as_str(), "completed" | "active" | "pending") {
        return Err(AppError::bad_request("Некоректний статус onboarding-задачі"));
    }

    if !is_valid_date(task.due_date.as_deref()) {
        return Err(AppError::bad_request("Дата дедлайну має бути у форматі YYYY-MM-DD"));
    }

    Ok(())
}

fn validate_move_payload(payload: &MovePayload) -> AppResult<()> {
    if !matches!(payload.direction.as_str(), "up" | "down") {
        return Err(AppError::bad_request("Напрямок переміщення має бути up або down"));
    }

    Ok(())
}
