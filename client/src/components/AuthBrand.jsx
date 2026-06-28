import { Sprout } from 'lucide-react';

export const AuthBrand = () => (
  <aside className="auth-brand">
    <div className="brand-mark">
      <span className="brand-icon"><Sprout size={22} /></span>
      CityFix
    </div>

    <div className="auth-copy">
      <span className="eyebrow">Cleaner civic response</span>
      <h1>Report issues with location clarity.</h1>
      <p>
        A calm workspace for citizens and city teams to capture, route, and resolve civic problems with less friction.
      </p>
      <div className="eco-strip" aria-hidden="true">
        <span>Map-first reports</span>
        <span>AI triage</span>
        <span>Green city ops</span>
      </div>
    </div>
  </aside>
);
