import { fetchJSON } from '../../api.ts';
import { ENDPOINTS } from '../../app/endpoints.ts';

export async function fetchEmployeesForSelect({ signal, mapEmployee } = {}) {
    const items = await fetchJSON(ENDPOINTS.employeesSortedByLastName, { signal });
    if (!Array.isArray(items)) return [];
    if (typeof mapEmployee !== 'function') return items;
    return items.map(mapEmployee);
}
