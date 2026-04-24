import { fetchJSON } from '../../api.js';
import { ENDPOINTS } from '../../app/endpoints.js';

export async function fetchEmployeesForSelect({ signal, mapEmployee } = {}) {
    const items = await fetchJSON(ENDPOINTS.employeesSortedByLastName, { signal });
    if (!Array.isArray(items)) return [];
    if (typeof mapEmployee !== 'function') return items;
    return items.map(mapEmployee);
}
