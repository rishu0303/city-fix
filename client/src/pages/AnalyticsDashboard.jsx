import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, LocateFixed, ShieldAlert } from 'lucide-react';
import { getDashboardAnalytics } from '../services/analyticsService.js';
import { useAuth } from '../hooks/useAuth.js';

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const formatScope = (scope) => {
  if (!scope) return 'Not loaded';
  if (scope.type === 'local') return `Local ${Math.round((scope.distanceMeters || 0) / 1000)}km radius`;
  if (scope.type === 'department') return `${scope.department} department`;
  return 'City-wide';
};

const ChartPanel = ({ title, subtitle, data, tone = 'green' }) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="workbench-panel chart-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="bar-list">
        {data.map((item) => (
          <div className="bar-row" key={item.name}>
            <div className="bar-label">
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="bar-track">
              <span
                className={`bar-fill ${tone}`}
                style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const TrendPanel = ({ data }) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="workbench-panel chart-panel wide-chart">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Trend</span>
          <h2>Daily complaint volume</h2>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="empty-state">
          <strong>No trend data for this range.</strong>
          <p>Try expanding the date range or waiting for new reports.</p>
        </div>
      ) : (
        <div className="trend-chart">
          {data.map((item) => (
            <div className="trend-column" key={item.name}>
              <span style={{ height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%` }} />
              <small>{item.name.slice(5)}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ from: thirtyDaysAgo, to: today, distance: '5000' });
  const [location, setLocation] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const isCitizen = user?.role === 'Citizen';
  const overview = useMemo(() => analytics?.data?.overview || {}, [analytics]);

  const metricTiles = useMemo(() => ([
    { label: 'Total', value: overview.total || 0, icon: Activity },
    { label: 'Open', value: overview.open || 0, icon: AlertTriangle },
    { label: 'Resolved', value: overview.resolved || 0, icon: CheckCircle2 },
    { label: 'High priority', value: overview.highPriority || 0, icon: ShieldAlert },
    { label: 'Resolution rate', value: `${overview.resolutionRate || 0}%`, icon: BarChart3 },
    { label: 'Avg resolution', value: `${overview.averageResolutionHours || 0}h`, icon: Clock3 }
  ]), [overview]);

  const updateFilter = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const loadAnalytics = async (nextLocation = location) => {
    setError('');

    if (isCitizen && !nextLocation) {
      setError('Share your location to load local analytics.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await getDashboardAnalytics({
        from: filters.from,
        to: filters.to,
        distance: filters.distance,
        longitude: nextLocation?.longitude,
        latitude: nextLocation?.latitude
      });
      setAnalytics(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  const detectLocationAndLoad = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        };
        setLocation(nextLocation);
        setIsLocating(false);
        loadAnalytics(nextLocation);
      },
      () => {
        setError('Location permission was denied. Citizen analytics require a local city coordinate.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section className="page-surface">
      <div className="page-header">
        <div>
          <span className="eyebrow">Analytics dashboard</span>
          <h1>{formatScope(analytics?.scope)} analytics.</h1>
          <p>
            Review complaint volume, status mix, severity distribution, and resolution performance for your role scope.
          </p>
        </div>
        {isCitizen ? (
          <button className="action-button" type="button" onClick={detectLocationAndLoad} disabled={isLocating || isLoading}>
            <LocateFixed size={18} />
            {isLocating ? 'Locating...' : 'Use my location'}
          </button>
        ) : (
          <button className="action-button" type="button" onClick={() => loadAnalytics()} disabled={isLoading}>
            <BarChart3 size={18} />
            {isLoading ? 'Loading...' : 'Load analytics'}
          </button>
        )}
      </div>

      <section className="workbench-panel filter-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Date range</span>
            <h2>Dashboard filters</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadAnalytics()} disabled={isLoading || (isCitizen && !location)}>
            Apply filters
          </button>
        </div>

        <div className="filter-grid">
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" value={filters.from} onChange={updateFilter} />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" value={filters.to} onChange={updateFilter} />
          </div>
          <div className="field">
            <label htmlFor="distance">Citizen radius</label>
            <select id="distance" name="distance" value={filters.distance} onChange={updateFilter} disabled={!isCitizen}>
              <option value="2000">2 km</option>
              <option value="5000">5 km</option>
              <option value="10000">10 km</option>
            </select>
          </div>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {isLoading && <div className="empty-state">Loading analytics...</div>}

      {!analytics && !isLoading && !error && (
        <div className="empty-state">
          <strong>{isCitizen ? 'Start with location.' : 'Load your scoped dashboard.'}</strong>
          <p>
            {isCitizen
              ? 'Citizen analytics are limited to nearby issues, so the backend needs your local coordinate.'
              : 'Department and SuperAdmin analytics are scoped automatically from your account role.'}
          </p>
        </div>
      )}

      {analytics && (
        <>
          <div className="metric-grid analytics-metrics">
            {metricTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <article className="metric-tile" key={tile.label}>
                  <Icon size={22} />
                  <span>{tile.label}</span>
                  <strong>{tile.value}</strong>
                </article>
              );
            })}
          </div>

          <div className="analytics-grid">
            <ChartPanel title="By status" subtitle="Workflow" data={analytics.data.byStatus || []} tone="green" />
            <ChartPanel title="By category" subtitle="Departments" data={analytics.data.byCategory || []} tone="blue" />
            <ChartPanel title="By severity" subtitle="Priority" data={analytics.data.bySeverity || []} tone="amber" />
            <TrendPanel data={analytics.data.trendByDay || []} />
          </div>
        </>
      )}
    </section>
  );
};
