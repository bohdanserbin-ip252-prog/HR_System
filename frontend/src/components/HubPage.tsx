import { useEffect, useState } from 'react';

export default function HubPage({
  title,
  description,
  isActive = true,
  tabs,
  initialTab = null,
  pageClassName = ''
}) {
  const visibleTabs = tabs.filter(tab => tab && !tab.hidden);
  const fallbackTabKey = visibleTabs[0]?.key || null;
  const [activeTab, setActiveTab] = useState(initialTab || fallbackTabKey);
  const [visitedTabs, setVisitedTabs] = useState(() =>
    initialTab || fallbackTabKey ? [initialTab || fallbackTabKey].filter(Boolean) : []
  );
  const currentTab = visibleTabs.find(tab => tab.key === activeTab) || visibleTabs[0] || null;

  useEffect(() => {
    if (!currentTab?.key) return;
    setVisitedTabs(current =>
      current.includes(currentTab.key) ? current : [...current, currentTab.key]
    );
  }, [currentTab?.key]);

  useEffect(() => {
    if (!currentTab?.key && fallbackTabKey) {
      setActiveTab(fallbackTabKey);
    }
  }, [currentTab?.key, fallbackTabKey]);

  return (
    <div className={`hub-page ${pageClassName}`.trim()}>
      <div className="page-header hub-page__header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="hub-tabs" role="tablist" aria-label={title}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            aria-selected={currentTab?.key === tab.key}
            id={`hub-tab-${tab.key}`}
            className={`hub-tab${currentTab?.key === tab.key ? ' hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.icon ? (
              <span className="material-symbols-outlined" aria-hidden="true">{tab.icon}</span>
            ) : null}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="hub-panel">
        {visibleTabs
          .filter(tab => visitedTabs.includes(tab.key))
          .map(tab => {
            const isTabActive = currentTab?.key === tab.key;
            const isPanelActive = Boolean(isActive && isTabActive);

            return (
              <section
                key={tab.key}
                aria-labelledby={`hub-tab-${tab.key}`}
                className={`hub-panel__section${isPanelActive ? ' hub-panel__section--active' : ''}`}
                hidden={!isTabActive}
                role="tabpanel"
              >
                {tab.render?.({ isActive: isPanelActive }) || null}
              </section>
            );
          })}
      </div>
    </div>
  );
}
