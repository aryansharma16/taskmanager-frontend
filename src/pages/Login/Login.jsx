import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearError } from '../../features/auth/authSlice';
import ThemeToggle from '../../components/ThemeToggle';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* TopAppBar */}
      <header className="bg-surface-container-lowest dark:bg-background/80 backdrop-blur-lg border-b border-outline-variant/30 dark:border-outline-variant/20 dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] top-0 z-50 flex items-center justify-between px-8 md:px-12 h-16 w-full fixed">
        <div className="flex items-center gap-8">
          <span className="text-xl font-extrabold text-on-surface font-['Manrope'] tracking-tight dark:font-['Space_Grotesk'] dark:italic">
            the Motion
          </span>
          <div className="hidden md:flex gap-6">
            <a className="text-sm font-medium text-on-surface-variant hover:text-primary-container dark:hover:text-on-surface transition-colors duration-200" href="#">Features</a>
            <a className="text-sm font-medium text-on-surface-variant hover:text-primary-container dark:hover:text-on-surface transition-colors duration-200" href="#">Pricing</a>
            <a className="text-sm font-medium text-on-surface-variant hover:text-primary-container dark:hover:text-on-surface transition-colors duration-200" href="#">Support</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="px-5 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 dark:hover:bg-primary/80 active:scale-[0.98] transition-all duration-200">
            Sign Up
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row pt-16">
        {/* Left Side: Login Form */}
        <section className="w-full md:w-1/2 bg-surface-container-lowest dark:bg-background flex items-center justify-center py-12 px-6 z-10">
          <div className="w-full max-w-[440px] space-y-6">
            {/* Card wrapper for dark mode glass effect */}
            <div className="dark:glass-card dark:p-10 dark:rounded-xl dark:shadow-2xl relative overflow-hidden">
              <div className="hidden dark:block absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px]"></div>

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[32px] dark:text-[36px] leading-tight font-bold dark:font-semibold text-on-surface tracking-tight">
                    Welcome Back
                  </h1>
                  <p className="text-base text-outline dark:text-on-surface-variant">
                    Sign in to manage your projects and tasks.
                  </p>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-container-lowest border border-outline-variant/40 rounded-lg font-semibold text-sm text-on-surface hover:bg-surface-container-low transition-all duration-200 active:scale-[0.99] dark:glass-panel dark:border-0">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    <span>Google</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-container-lowest border border-outline-variant/40 rounded-lg font-semibold text-sm text-on-surface hover:bg-surface-container-low transition-all duration-200 active:scale-[0.99] dark:glass-panel dark:border-0">
                    <span className="material-symbols-outlined text-[20px]">code</span>
                    <span>GitHub</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-outline-variant/40"></div>
                  <span className="flex-shrink mx-4 text-xs font-medium text-outline dark:text-on-surface-variant uppercase tracking-wider">or continue with email</span>
                  <div className="flex-grow border-t border-outline-variant/40"></div>
                </div>

                {error && (
                  <div className="bg-error-container/30 border border-error/20 text-error p-3 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="font-semibold text-sm text-on-surface-variant block">Email Address</label>
                    <input
                      className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline transition-all duration-200 focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 dark:focus:border-primary outline-none"
                      placeholder="name@company.com"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm text-on-surface-variant block">Password</label>
                      <a className="text-xs font-medium text-primary-container dark:text-primary hover:underline" href="#">Forgot password?</a>
                    </div>
                    <input
                      className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline transition-all duration-200 focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 dark:focus:border-primary outline-none"
                      placeholder="••••••••"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-2">
                    <input className="w-4 h-4 rounded border-outline-variant text-primary-container dark:text-primary focus:ring-primary-container dark:focus:ring-primary" id="remember" type="checkbox" />
                    <label className="text-xs font-medium text-on-surface-variant" htmlFor="remember">Keep me signed in for 30 days</label>
                  </div>

                  {/* Submit */}
                  <button
                    className="w-full py-3.5 bg-primary-container dark:bg-gradient-to-r dark:from-primary dark:to-secondary-container text-white dark:text-on-primary-container rounded-lg font-semibold text-base shadow-[0px_4px_12px_rgba(0,82,204,0.15)] dark:shadow-lg dark:shadow-primary/20 hover:brightness-90 dark:hover:shadow-primary/40 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
                    type="submit"
                    disabled={loading}
                  >
                    {loading && <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-sm text-on-surface-variant">
                  Don't have an account?{' '}
                  <a className="text-primary-container dark:text-tertiary font-semibold hover:underline" href="#">Request access</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Dashboard Preview */}
        <section className="hidden md:flex w-1/2 bg-surface-container-low dark:bg-background relative overflow-hidden items-center justify-center p-12">
          {/* Light mode: dot pattern background */}
          <div className="absolute inset-0 opacity-40 dark:hidden" style={{ backgroundImage: 'radial-gradient(rgb(var(--color-primary-container)) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

          {/* Dark mode: image background + glows */}
          <div className="absolute inset-0 z-0 hidden dark:block">
            <img
              className="w-full h-full object-cover opacity-30 brightness-50"
              alt="dark textured background"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqel0CJUK8f68edoEON40MhiItFOizF6BF1VCIJ2hcp_5oC6llKEcyKhrC697c-S0rr1b1sQfs1e03OoNSIEzh85wqOD3ZvdBy10RYdKx0UtFIKAv0rIeA0IewKedS_vBF2UdA8sDOsdlQ9cfUA3qvXC94oPJCKufI_fzpuYYgibVspzu576mpo8AzB8wFM3dO_Kb8GvkY303BpCySP-jJZpBIRHsLWLzQ8Dl2lM7R4EHqNuXob7-i2gDXT5v5-BAgGm61hGHNDzKq"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background"></div>
          </div>

          {/* Dark mode decorative glows */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] mix-blend-screen animate-pulse hidden dark:block pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/2 w-64 h-64 bg-blue-600/15 rounded-full blur-[100px] mix-blend-screen hidden dark:block pointer-events-none"></div>

          {/* Dashboard Mockup Card */}
          <div className="relative z-10 w-full max-w-xl">
            <div className="glass-card rounded-2xl p-8 shadow-2xl dark:rotate-2 dark:hover:rotate-0 transition-transform duration-700">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container dark:bg-primary/20 flex items-center justify-center text-white dark:text-primary border dark:border-primary/40">
                    <span className="material-symbols-outlined">dashboard</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-on-surface">Task Overview</h3>
                    <p className="text-xs text-outline dark:text-primary">Project Alpha • Q4 Progress</p>
                  </div>
                </div>
                <span className="bg-secondary-container dark:bg-tertiary/10 text-on-secondary-container dark:text-tertiary px-3 py-1 rounded-full text-xs font-medium border dark:border-tertiary/20">84% Complete</span>
              </div>

              {/* Task List */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-surface-container-lowest/60 dark:glass-panel rounded-xl border border-outline-variant/20 dark:border-l-2 dark:border-l-tertiary">
                  <span className="material-symbols-outlined text-secondary dark:text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-on-surface">Core API Integration</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">Completed 2 days ago</div>
                  </div>
                  <span className="text-xs font-semibold bg-secondary/5 dark:bg-tertiary/10 text-secondary dark:text-tertiary px-2 py-0.5 rounded border border-secondary/10 dark:border-tertiary/20">DONE</span>
                </div>

                <div className="flex items-center gap-4 p-4 bg-surface-container-lowest/60 dark:glass-panel rounded-xl border border-outline-variant/20 dark:border-l-2 dark:border-l-secondary">
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-on-surface">UI Component Audit</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">In progress • 3 subtasks</div>
                  </div>
                  <span className="text-xs font-semibold bg-primary/5 dark:bg-secondary/10 text-primary dark:text-secondary px-2 py-0.5 rounded border border-primary/10 dark:border-secondary/20">MED</span>
                </div>

                <div className="flex items-center gap-4 p-4 bg-surface-container-lowest/60 dark:glass-panel rounded-xl border border-outline-variant/20 dark:border-l-2 dark:border-l-primary">
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-on-surface">Security Protocol Sync</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">Due tomorrow</div>
                  </div>
                  <span className="text-xs font-semibold bg-error/5 dark:bg-primary/10 text-error dark:text-primary px-2 py-0.5 rounded border border-error/10 dark:border-primary/20">URGENT</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-primary/5 dark:glass-panel p-4 rounded-xl border border-primary/10 dark:border-0">
                  <p className="text-xs font-medium text-primary dark:text-primary mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-on-surface">1,248h</p>
                </div>
                <div className="bg-secondary/5 dark:glass-panel p-4 rounded-xl border border-secondary/10 dark:border-0">
                  <p className="text-xs font-medium text-secondary dark:text-tertiary mb-1">Efficiency</p>
                  <p className="text-2xl font-bold text-on-surface">98.2%</p>
                </div>
              </div>
            </div>

            {/* Light mode floating decorations */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-secondary-container/30 blur-3xl rounded-full dark:hidden"></div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-container/20 blur-3xl rounded-full dark:hidden"></div>
          </div>

          {/* Light mode quote overlay */}
          <div className="absolute bottom-12 left-12 right-12 text-left dark:hidden">
            <p className="font-['Manrope'] text-xl font-semibold text-on-surface/80 max-w-sm leading-relaxed">
              "Streamlining complex workflows with absolute precision."
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-transparent border-t border-outline-variant/20 dark:border-on-surface/5 flex flex-row justify-between items-center w-full px-12 py-5 fixed bottom-0 z-50">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-on-surface font-['Manrope'] dark:font-['Space_Grotesk']">the Motion</span>
          <span className="text-xs text-on-surface-variant dark:text-on-surface-variant/60">© 2026 the Motion. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a className="text-xs text-on-surface-variant/70 hover:text-on-surface dark:hover:text-primary underline-offset-4 hover:underline transition-all duration-200" href="#">Privacy</a>
          <a className="text-xs text-on-surface-variant/70 hover:text-on-surface dark:hover:text-primary underline-offset-4 hover:underline transition-all duration-200" href="#">Terms</a>
          <a className="text-xs text-on-surface-variant/70 hover:text-on-surface dark:hover:text-primary underline-offset-4 hover:underline transition-all duration-200" href="#">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default Login;
