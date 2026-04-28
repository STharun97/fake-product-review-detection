import { Link, useLocation } from "react-router-dom";
import { Shield, History, BarChart3, Menu, X, Upload, Globe, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const Layout = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add scroll listener for dynamic header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { path: "/", label: "Analyze", icon: Sparkles },
    { path: "/url-analysis", label: "URL Check", icon: Globe },
    { path: "/bulk", label: "Bulk Upload", icon: Upload },
    { path: "/history", label: "History", icon: History },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Interactive Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-900/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm" : "bg-transparent py-2"
        }`}
        data-testid="header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Premium Logo Design */}
            <Link
              to="/"
              className="flex items-center gap-3 group"
              data-testid="logo-link"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30 group-hover:shadow-blue-900/50 transition-all duration-300">
                <Shield className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-xl tracking-tight text-gray-900 uppercase">
                  Review<span className="text-blue-800">Guard</span>
                </span>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 -mt-1">
                  Professional Review Analysis
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5 p-1.5 bg-gray-50/50 rounded-2xl border border-gray-100" data-testid="desktop-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl font-body text-sm font-medium transition-all duration-300
                    ${isActive(item.path)
                      ? "bg-white text-blue-900 shadow-sm border border-gray-100/50"
                      : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 ${isActive(item.path) ? "text-blue-800" : "text-gray-400"}`} strokeWidth={isActive(item.path) ? 2 : 1.5} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" strokeWidth={1.5} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Mobile Navigation Dropdown */}
          <div className={`
            md:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${mobileMenuOpen ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"}
          `}>
            <nav className="flex flex-col gap-1 p-2 bg-white rounded-2xl border border-gray-100 shadow-lg mt-2" data-testid="mobile-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium transition-all duration-200
                    ${isActive(item.path)
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  <div className={`p-1.5 rounded-lg ${isActive(item.path) ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-400"}`}>
                    <item.icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {children}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-gray-200/60 bg-white/50 backdrop-blur-sm mt-auto relative z-10" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Shield className="w-4 h-4 text-blue-800" strokeWidth={2} />
              </div>
              <span className="font-heading font-bold text-sm tracking-tight text-gray-800 uppercase">
                ReviewGuard
              </span>
            </div>
            
            <p className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 shadow-sm">
              ✨ Modern AI Analysis
            </p>
            
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="hover:text-blue-800 transition-colors cursor-pointer">Deep Learning</span>
              <span className="w-1 h-1 bg-blue-200 rounded-full" />
              <span className="hover:text-blue-800 transition-colors cursor-pointer">NLP Analysis</span>
              <span className="w-1 h-1 bg-blue-200 rounded-full" />
              <span className="hover:text-blue-800 transition-colors cursor-pointer">Pattern Recognition</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
