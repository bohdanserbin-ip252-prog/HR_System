use rusqlite::Connection;

pub fn seed_candidates(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM candidates", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }
    let candidates = [
        (
            "Олена Коваленко",
            "olena.k@email.com",
            "+380671112233",
            "Frontend розробник",
            "new",
            "LinkedIn",
            4,
            "Сильний портфоліо",
        ),
        (
            "Андрій Шевченко",
            "andriy.s@email.com",
            "+380672223344",
            "Backend розробник",
            "screening",
            "Рекомендація",
            5,
            "Досвід 5 років",
        ),
        (
            "Марія Петренко",
            "maria.p@email.com",
            "+380673334455",
            "HR менеджер",
            "interview",
            "Jobs.ua",
            3,
            "Хороші soft skills",
        ),
        (
            "Іван Довженко",
            "ivan.d@email.com",
            "+380674445566",
            "DevOps інженер",
            "offer",
            "LinkedIn",
            5,
            "AWS certified",
        ),
        (
            "Софія Мельник",
            "sofia.m@email.com",
            "+380675556677",
            "QA інженер",
            "hired",
            "Кар'єрний сайт",
            4,
            "Автоматизація тестів",
        ),
        (
            "Дмитро Бондаренко",
            "dmytro.b@email.com",
            "+380676667788",
            "Product Manager",
            "rejected",
            "LinkedIn",
            2,
            "Не вистачає досвіду",
        ),
    ];
    for c in candidates {
        conn.execute(
            "INSERT INTO candidates (full_name, email, phone, position_applied, stage, source, rating, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![c.0, c.1, c.2, c.3, c.4, c.5, c.6, c.7],
        )?;
    }
    Ok(())
}

pub fn seed_tickets(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM tickets", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }
    let tickets = [
        (
            "Не працює принтер у відділі HR",
            "Принтер HP LaserJet не друкує, помилка Jam",
            "it",
            "high",
            "open",
            "Наталія Іваненко",
            "IT Support",
        ),
        (
            "Запит на відпустку — терміново",
            "Потрібно узгодити відпустку з 01.06 по 14.06",
            "hr",
            "medium",
            "in_progress",
            "Олексій Петров",
            "HR Manager",
        ),
        (
            "Поламана кавоварка",
            "Кавоварка на кухні не гріє воду",
            "facilities",
            "low",
            "resolved",
            "Анна Сидоренко",
            "Facilities",
        ),
        (
            "Помилка в розрахунковому листі",
            "Відсутня надбавка за понаднормові години",
            "payroll",
            "critical",
            "open",
            "Максим Коваль",
            "Payroll Team",
        ),
        (
            "Доступ до CRM системи",
            "Новий співробітник потребує доступу до Salesforce",
            "it",
            "medium",
            "in_progress",
            "HR Manager",
            "IT Support",
        ),
    ];
    for t in tickets {
        conn.execute(
            "INSERT INTO tickets (title, description, category, priority, status, requester_name, assignee_name)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![t.0, t.1, t.2, t.3, t.4, t.5, t.6],
        )?;
    }
    Ok(())
}

pub fn seed_surveys(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM surveys", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }
    let surveys = [
        (
            "Задоволеність робочим місцем",
            "Чи задоволені ви своїм робочим місцем?",
            "[\"Так\",\"Ні\",\"Частково\"]",
            1,
        ),
        (
            "Корпоративна культура",
            "Чи рекомендували б ви компанію як місце роботи?",
            "[\"Так\",\"Ні\"]",
            1,
        ),
    ];
    for s in surveys {
        conn.execute(
            "INSERT INTO surveys (title, question, options, active) VALUES (?, ?, ?, ?)",
            rusqlite::params![s.0, s.1, s.2, s.3],
        )?;
    }
    let survey_ids: Vec<i64> = conn
        .prepare("SELECT id FROM surveys")?
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    if !survey_ids.is_empty() {
        let votes = [
            (survey_ids[0], 0, "Олена"),
            (survey_ids[0], 0, "Андрій"),
            (survey_ids[0], 0, "Марія"),
            (survey_ids[0], 2, "Іван"),
            (survey_ids[0], 1, "Софія"),
            (survey_ids[1], 0, "Олена"),
            (survey_ids[1], 0, "Андрій"),
            (survey_ids[1], 0, "Марія"),
            (survey_ids[1], 0, "Іван"),
        ];
        for v in votes {
            conn.execute(
                "INSERT INTO survey_votes (survey_id, choice_index, voter_name) VALUES (?, ?, ?)",
                rusqlite::params![v.0, v.1, v.2],
            )?;
        }
    }
    Ok(())
}
