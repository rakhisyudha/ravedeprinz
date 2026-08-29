'use client';

import { useState } from 'react';

type Tab = { id: string; label: string; count?: number; content: React.ReactNode };

export function AdminTabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="admin-tabs-shell">
      <div className="admin-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            className={`admin-tab touch-target ${active === tab.id ? 'is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label} {tab.count != null && <small>×{tab.count}</small>}
          </button>
        ))}
      </div>
      <div className="admin-tab-panel" role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}

export function AccordionItem({ title, subtitle, defaultOpen = false, children }: { title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="admin-accordion-item">
      <button type="button" className="admin-accordion-head touch-target" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span><b>{title}</b> {subtitle && <small>{subtitle}</small>}</span>
        <span className="admin-accordion-icon">{open ? '—' : '+'}</span>
      </button>
      {open && <div className="admin-accordion-body">{children}</div>}
    </div>
  );
}
