import FormErrorMessage from '../FormErrorMessage.jsx';

const FORM_ROW_CLASS = 'form-row';

function TextInput({ id, label, value, onChange, disabled, type = 'text', placeholder = '' }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export default function EmployeeModalForm({
  form,
  setForm,
  departments,
  positions,
  disableFields,
  errorMessage,
  onSubmit
}) {
  return (
    <form id="employeeModalForm" onSubmit={onSubmit}>
      <FormErrorMessage message={errorMessage} style={{ display: 'block', marginBottom: '16px' }} />

      <div className={FORM_ROW_CLASS}>
        <TextInput
          id="empLastName"
          label="Прізвище *"
          placeholder="Коваленко"
          value={form.lastName}
          onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))}
          disabled={disableFields}
        />
        <TextInput
          id="empFirstName"
          label="Ім'я *"
          placeholder="Олександр"
          value={form.firstName}
          onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))}
          disabled={disableFields}
        />
      </div>

      <div className={FORM_ROW_CLASS}>
        <TextInput
          id="empMiddleName"
          label="По батькові"
          placeholder="Миколайович"
          value={form.middleName}
          onChange={event => setForm(current => ({ ...current, middleName: event.target.value }))}
          disabled={disableFields}
        />
        <TextInput
          id="empEmail"
          label="Email"
          type="email"
          placeholder="email@company.ua"
          value={form.email}
          onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
          disabled={disableFields}
        />
      </div>

      <div className={FORM_ROW_CLASS}>
        <TextInput
          id="empPhone"
          label="Телефон"
          placeholder="+380501234567"
          value={form.phone}
          onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
          disabled={disableFields}
        />
        <TextInput
          id="empBirthDate"
          label="Дата народження"
          type="date"
          value={form.birthDate}
          onChange={event => setForm(current => ({ ...current, birthDate: event.target.value }))}
          disabled={disableFields}
        />
      </div>

      <div className={FORM_ROW_CLASS}>
        <div className="form-group">
          <label htmlFor="empDepartment">Відділ</label>
          <select
            id="empDepartment"
            className="form-input"
            value={form.departmentId}
            onChange={event => setForm(current => ({ ...current, departmentId: event.target.value }))}
            disabled={disableFields}
          >
            <option value="">— Оберіть відділ —</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="empPosition">Посада</label>
          <select
            id="empPosition"
            className="form-input"
            value={form.positionId}
            onChange={event => setForm(current => ({ ...current, positionId: event.target.value }))}
            disabled={disableFields}
          >
            <option value="">— Оберіть посаду —</option>
            {positions.map(position => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={FORM_ROW_CLASS}>
        <TextInput
          id="empSalary"
          label="Зарплата (₴)"
          type="number"
          placeholder="30000"
          value={form.salary}
          onChange={event => setForm(current => ({ ...current, salary: event.target.value }))}
          disabled={disableFields}
        />
        <TextInput
          id="empHireDate"
          label="Дата прийому *"
          type="date"
          value={form.hireDate}
          onChange={event => setForm(current => ({ ...current, hireDate: event.target.value }))}
          disabled={disableFields}
        />
      </div>

      <div className={FORM_ROW_CLASS}>
        <div className="form-group">
          <label htmlFor="empStatus">Статус</label>
          <select
            id="empStatus"
            className="form-input"
            value={form.status}
            onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
            disabled={disableFields}
          >
            <option value="active">Активний</option>
            <option value="on_leave">У відпустці</option>
            <option value="fired">Звільнений</option>
          </select>
        </div>
        <TextInput
          id="empAddress"
          label="Адреса"
          placeholder="м. Київ, вул. Хрещатик, 10"
          value={form.address}
          onChange={event => setForm(current => ({ ...current, address: event.target.value }))}
          disabled={disableFields}
        />
      </div>
    </form>
  );
}
