import HubPage from './HubPage.jsx';
import { createOperationTabs } from './operationTabDefinitions.jsx';

export default function OperationsPage({ currentUser, isActive }) {
  return (
    <HubPage
      title="Operations"
      description="Операційний центр для enterprise-модулів, сервісних потоків і платформених інструментів."
      isActive={isActive}
      tabs={createOperationTabs({ currentUser, isActive })}
      pageClassName="operations-page"
    />
  );
}
