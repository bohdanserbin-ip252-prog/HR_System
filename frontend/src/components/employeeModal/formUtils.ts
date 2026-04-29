import { parseFiniteNumberInput, parseIntegerInput } from '../../developmentOnboardingFormUtils.ts';

export function getTodayInputValue() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().split('T')[0];
}

export function createEmptyForm() {
  return {
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    birthDate: '',
    hireDate: getTodayInputValue(),
    salary: '',
    departmentId: '',
    positionId: '',
    status: 'active',
    address: ''
  };
}

export function mapEmployeeToForm(employee) {
  return {
    firstName: employee?.first_name || '',
    lastName: employee?.last_name || '',
    middleName: employee?.middle_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    birthDate: employee?.birth_date || '',
    hireDate: employee?.hire_date || getTodayInputValue(),
    salary: employee?.salary != null ? String(employee.salary) : '',
    departmentId: employee?.department_id != null ? String(employee.department_id) : '',
    positionId: employee?.position_id != null ? String(employee.position_id) : '',
    status: employee?.status || 'active',
    address: employee?.address || ''
  };
}

export function buildEmployeePayload(form) {
  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    middle_name: form.middleName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    birth_date: form.birthDate || '',
    hire_date: form.hireDate,
    salary: parseFiniteNumberInput(form.salary, { emptyValue: 0 }),
    department_id: parseIntegerInput(form.departmentId),
    position_id: parseIntegerInput(form.positionId),
    status: form.status || 'active',
    address: form.address.trim()
  };
}
