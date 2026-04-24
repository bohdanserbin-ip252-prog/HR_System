use crate::db::{AuditEventInput, record_audit_event, table_has_rows};
use crate::error::{AppError, AppResult};
use rusqlite::{Connection, params};

pub fn seed_employees(conn: &Connection) -> AppResult<()> {
    if !table_has_rows(conn, "employees")? {
        let mut insert_employee = conn
            .prepare(
                "INSERT INTO employees
                (first_name, last_name, middle_name, email, phone, birth_date, hire_date, salary, department_id, position_id, status, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .map_err(|err| AppError::internal(err.to_string()))?;

        let first_names_male = [
            "Олександр",
            "Сергій",
            "Дмитро",
            "Андрій",
            "Максим",
            "Артем",
            "Іван",
            "Павло",
            "Микола",
            "Володимир",
            "Роман",
            "Олег",
            "Євген",
            "Віктор",
            "Богдан",
        ];
        let first_names_female = [
            "Олена",
            "Марія",
            "Анна",
            "Катерина",
            "Юлія",
            "Наталія",
            "Тетяна",
            "Вікторія",
            "Софія",
            "Ірина",
            "Оксана",
            "Христина",
            "Людмила",
            "Зоряна",
            "Аліна",
        ];
        let last_names = [
            "Коваленко",
            "Шевченко",
            "Бондаренко",
            "Петренко",
            "Ткаченко",
            "Іваненко",
            "Савченко",
            "Лисенко",
            "Мороз",
            "Кравченко",
            "Гриценко",
            "Дяченко",
            "Федоренко",
            "Захарченко",
            "Сидоренко",
            "Романенко",
            "Мельник",
            "Попенко",
            "Карпенко",
            "Гончаренко",
        ];
        let middle_names_male = [
            "Олександрович",
            "Сергійович",
            "Дмитрович",
            "Андрійович",
            "Максимович",
            "Іванович",
            "Павлович",
            "Миколайович",
            "Володимирович",
            "Романович",
            "Олегович",
            "Євгенович",
            "Вікторович",
            "Богданович",
        ];
        let middle_names_female = [
            "Олександрівна",
            "Сергіївна",
            "Дмитрівна",
            "Андріївна",
            "Максимівна",
            "Іванівна",
            "Павлівна",
            "Миколаївна",
            "Володимирівна",
            "Романівна",
            "Олегівна",
            "Євгенівна",
            "Вікторівна",
            "Богданівна",
        ];
        let departments = [1i64, 2, 3, 4, 5];
        let positions = [1i64, 2, 3, 4, 5, 6, 7, 8];
        let statuses = ["active", "on_leave", "fired"];
        let cities = [
            "Київ",
            "Харків",
            "Львів",
            "Одеса",
            "Дніпро",
            "Запоріжжя",
            "Вінниця",
            "Чернігів",
            "Полтава",
            "Івано-Франківськ",
        ];
        let latin_first_male = [
            "oleksandr",
            "serhii",
            "dmytro",
            "andrii",
            "maksym",
            "artem",
            "ivan",
            "pavlo",
            "mykola",
            "volodymyr",
            "roman",
            "oleh",
            "yevhen",
            "viktor",
            "bohdan",
        ];
        let latin_first_female = [
            "olena",
            "mariia",
            "anna",
            "kateryna",
            "yuliia",
            "nataliia",
            "tetiana",
            "viktoriia",
            "sofiia",
            "iryna",
            "oksana",
            "khrystyna",
            "liudmyla",
            "zorian",
            "alina",
        ];
        let latin_last = [
            "kovalenko",
            "shevchenko",
            "bondarenko",
            "petrenko",
            "tkachenko",
            "ivanenko",
            "savchenko",
            "lysenko",
            "moroz",
            "kravchenko",
            "hrytsenko",
            "diachenko",
            "fedorenko",
            "zakharchenko",
            "sydorenko",
            "romanenko",
            "melnyk",
            "popnenko",
            "karpenko",
            "honcharenko",
        ];

        for i in 0..50 {
            let last_name = last_names[i % last_names.len()];
            let (first_name, middle_name) = if i % 2 == 0 {
                (
                    first_names_male[i % first_names_male.len()],
                    middle_names_male[i % middle_names_male.len()],
                )
            } else {
                (
                    first_names_female[i % first_names_female.len()],
                    middle_names_female[i % middle_names_female.len()],
                )
            };
            let latin_first = if i % 2 == 0 {
                latin_first_male[i % latin_first_male.len()]
            } else {
                latin_first_female[i % latin_first_female.len()]
            };
            let latin_last_name = latin_last[i % latin_last.len()];
            let dept = departments[i % departments.len()];
            let pos = positions[i % positions.len()];
            let status = statuses[i % statuses.len()];
            let salary = 15000.0 + ((i as f64) * 1300.0) % 65000.0;
            let hire_year = 2020 + (i % 7);
            let hire_month = 1 + (i % 12);
            let hire_day = 1 + (i % 28);
            let hire_date = format!("{:04}-{:02}-{:02}", hire_year, hire_month, hire_day);
            let birth_year = 1975 + (i % 30);
            let birth_month = 1 + ((i + 3) % 12);
            let birth_day = 1 + ((i + 7) % 28);
            let birth_date = format!("{:04}-{:02}-{:02}", birth_year, birth_month, birth_day);
            let email = if i == 0 {
                "kovalenko@company.ua".to_string()
            } else {
                format!("{}.{}{}@company.ua", latin_first, latin_last_name, i + 1)
            };
            let phone = format!("+38050{:07}", 1_000_000 + (i as u32) * 12_345);
            let city = cities[i % cities.len()];
            let address = format!("м. {}, вул. Центральна, {}", city, (i % 100) + 1);

            insert_employee
                .execute(params![
                    first_name,
                    last_name,
                    Some(middle_name),
                    Some(email),
                    Some(phone),
                    Some(birth_date),
                    hire_date,
                    salary,
                    Some(dept),
                    Some(pos),
                    status,
                    Some(address)
                ])
                .map_err(|err| AppError::internal(err.to_string()))?;
        }

        record_audit_event(
            conn,
            AuditEventInput {
                actor_user_id: None,
                actor_username: Some("system"),
                action: "seed",
                entity_type: "employee",
                entity_id: None,
                entity_name: Some("employees"),
                details: Some("seeded 50 employees"),
            },
        )
        .map_err(|err| AppError::internal(err.to_string()))?;
    }

    super::complaints::seed_complaints(conn)?;
    Ok(())
}
