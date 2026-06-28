import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AuthBrand } from '../components/AuthBrand.jsx';
import { useAuth } from '../hooks/useAuth.js';

const departments = ['Roads', 'Electrical', 'Sanitation', 'Water', 'General'];

export const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Citizen',
    departmentAssigned: 'Roads'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const setRole = (role) => {
    setForm((current) => ({
      ...current,
      role
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role
    };

    if (form.role === 'DepartmentAdmin') {
      payload.departmentAssigned = form.departmentAssigned;
    }

    try {
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create your account. Please check the details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBrand />
      <main className="auth-panel">
        <section className="auth-card">
          <h2>Create account</h2>
          <p>Citizens can report immediately. Department admins require SuperAdmin approval.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" value={form.name} onChange={updateField} autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" minLength={8} value={form.password} onChange={updateField} autoComplete="new-password" required />
            </div>

            <div className="field">
              <span className="role-label">Account type</span>
              <div className="role-picker">
                <button className={`role-option ${form.role === 'Citizen' ? 'active' : ''}`} type="button" onClick={() => setRole('Citizen')}>
                  Citizen
                </button>
                <button className={`role-option ${form.role === 'DepartmentAdmin' ? 'active' : ''}`} type="button" onClick={() => setRole('DepartmentAdmin')}>
                  Department Admin
                </button>
              </div>
            </div>

            {form.role === 'DepartmentAdmin' && (
              <div className="field">
                <label htmlFor="departmentAssigned">Department</label>
                <select id="departmentAssigned" name="departmentAssigned" value={form.departmentAssigned} onChange={updateField}>
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
            )}

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <UserPlus size={18} />
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
};
