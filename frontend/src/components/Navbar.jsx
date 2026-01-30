import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { useAuth } from "../App";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Villas", href: "/villas" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "List Your Villa", href: "/list-your-villa" },
    { name: "Contact", href: "/contact" },
  ];

  const isHomePage = location.pathname === "/";
  const navBg = isScrolled || !isHomePage
    ? "bg-background/95 backdrop-blur-md border-b border-border/50"
    : "bg-transparent";
  const textColor = isScrolled || !isHomePage ? "text-foreground" : "text-white";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
      data-testid="main-navbar"
    >
      <div className="container-luxury">
        <nav className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center"
            data-testid="logo-link"
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_villas-dashboard/artifacts/wpycq8hc_1jpg-01.jpg" 
              alt="Travaholic Stays"
              className="h-12 md:h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm uppercase tracking-widest transition-colors hover:text-accent ${textColor}`}
                data-testid={`nav-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-6">
            <a
              href="tel:+919876543210"
              className={`flex items-center gap-2 text-sm ${textColor}`}
              data-testid="phone-link"
            >
              <Phone size={16} />
              <span>+91 98765 43210</span>
            </a>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`flex items-center gap-2 ${textColor}`}
                    data-testid="user-menu-trigger"
                  >
                    <span className="text-sm">{user?.name}</span>
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" data-testid="admin-dashboard-link">
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(user?.role === "owner" || user?.role === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link to="/owner" data-testid="owner-dashboard-link">
                        Owner Portal
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={logout}
                    data-testid="logout-btn"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" data-testid="login-btn">
                <Button
                  variant="outline"
                  className={`rounded-full px-6 ${
                    isScrolled || !isHomePage
                      ? ""
                      : "border-white text-white hover:bg-white hover:text-foreground"
                  }`}
                >
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 ${textColor}`}
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-btn"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-t border-border"
            data-testid="mobile-menu"
          >
            <div className="container-luxury py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-lg py-2 hover:text-accent transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <hr className="border-border" />
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Signed in as {user?.name}
                  </span>
                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      className="text-lg py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {(user?.role === "owner" || user?.role === "admin") && (
                    <Link
                      to="/owner"
                      className="text-lg py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Owner Portal
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="text-lg py-2 text-left text-destructive"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-lg py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
