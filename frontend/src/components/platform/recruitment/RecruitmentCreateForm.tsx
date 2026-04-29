export default function RecruitmentCreateForm({ createBusy, onSubmit }) {
  return (
    <form className="recruitment-create-form" onSubmit={onSubmit}>
      <div className="recruitment-create-form__head">
        <h2>Новий кандидат</h2>
        <p>Мінімально потрібно заповнити ПІБ та посаду.</p>
      </div>
      <div className="recruitment-create-grid">
        <label className="recruitment-field">
          <span>ПІБ кандидата *</span>
          <input aria-label="ПІБ кандидата *" name="full_name" required type="text" />
        </label>
        <label className="recruitment-field">
          <span>Посада *</span>
          <input aria-label="Посада *" name="position_applied" required type="text" />
        </label>
        <label className="recruitment-field">
          <span>Email</span>
          <input aria-label="Email" name="email" type="email" />
        </label>
        <label className="recruitment-field">
          <span>Телефон</span>
          <input aria-label="Телефон" name="phone" type="tel" />
        </label>
        <label className="recruitment-field">
          <span>Джерело</span>
          <input aria-label="Джерело" name="source" type="text" />
        </label>
        <label className="recruitment-field">
          <span>Рейтинг (0-5)</span>
          <select aria-label="Рейтинг (0-5)" defaultValue="" name="rating">
            <option value="">Без оцінки</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>
        <label className="recruitment-field recruitment-field--wide">
          <span>Нотатки для команди</span>
          <textarea aria-label="Нотатки для команди" name="notes" rows={3}></textarea>
        </label>
      </div>
      <button className="btn btn-primary recruitment-create-form__submit" disabled={createBusy} type="submit">
        {createBusy ? 'Додаємо...' : 'Додати кандидата'}
      </button>
    </form>
  );
}
