import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, Calendar, Users, DollarSign, MessageSquare,
  Settings, LogOut, Menu, X, Plus, ChevronDown, FileText, Building
} from "lucide-react";
import { useAuth, API } from "../../App";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import axios from "axios";

// Admin Dashboard Component
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Home, label: "Villas", path: "/admin/villas" },
    { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
    { icon: MessageSquare, label: "Leads", path: "/admin/leads" },
    { icon: Users, label: "Owners", path: "/admin/owners" },
    { icon: DollarSign, label: "Financials", path: "/admin/financials" },
    { icon: Building, label: "Listings", path: "/admin/listings" },
    { icon: FileText, label: "Razorpay Setup", path: "/admin/razorpay" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-foreground text-background transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-background/10">
            <Link to="/">
              <img 
                src="https://customer-assets.emergentagent.com/job_villas-dashboard/artifacts/wpycq8hc_1jpg-01.jpg" 
                alt="Travaholic Stays"
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-background/60 mt-2">Admin Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-background/70 hover:text-background hover:bg-background/10"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-background/10">
            <div className="flex items-center gap-3 mb-4">
              {user?.picture && (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-background/60 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-background/60 hover:text-background"
              data-testid="admin-logout-btn"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-sidebar-toggle"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1" />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              View Site
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="villas" element={<AdminVillas />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="owners" element={<AdminOwners />} />
            <Route path="financials" element={<AdminFinancials />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="razorpay" element={<RazorpaySetup />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Admin Overview
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [villasRes, bookingsRes, leadsRes, financialsRes] = await Promise.all([
        axios.get(`${API}/villas`, { headers }),
        axios.get(`${API}/bookings`, { headers }),
        axios.get(`${API}/leads`, { headers }),
        axios.get(`${API}/financials/summary`, { headers }),
      ]);

      setStats({
        totalVillas: villasRes.data.total,
        totalBookings: bookingsRes.data.total,
        totalLeads: leadsRes.data.total,
        totalRevenue: financialsRes.data.total_revenue,
        totalCommission: financialsRes.data.total_commission,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Dashboard Overview</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-6 border border-border animate-pulse">
              <div className="h-4 bg-muted w-1/2 mb-4" />
              <div className="h-8 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Total Villas</p>
            <p className="font-heading text-3xl">{stats?.totalVillas || 0}</p>
          </div>
          <div className="bg-card p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
            <p className="font-heading text-3xl">{stats?.totalBookings || 0}</p>
          </div>
          <div className="bg-card p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Total Leads</p>
            <p className="font-heading text-3xl">{stats?.totalLeads || 0}</p>
          </div>
          <div className="bg-card p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Total Commission</p>
            <p className="font-heading text-3xl">{formatPrice(stats?.totalCommission)}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="font-heading text-xl mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/admin/villas">
            <Button className="btn-luxury-outline" data-testid="manage-villas-btn">
              <Home size={16} className="mr-2" />
              Manage Villas
            </Button>
          </Link>
          <Link to="/admin/bookings">
            <Button className="btn-luxury-outline" data-testid="view-bookings-btn">
              <Calendar size={16} className="mr-2" />
              View Bookings
            </Button>
          </Link>
          <Link to="/admin/leads">
            <Button className="btn-luxury-outline" data-testid="view-leads-btn">
              <MessageSquare size={16} className="mr-2" />
              View Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Seed Data Button */}
      <div className="mt-8 p-6 bg-accent/10 border border-accent/20">
        <h3 className="font-heading text-lg mb-2">Demo Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Click to add sample villas and add-ons for testing.
        </p>
        <Button
          onClick={async () => {
            try {
              await axios.post(`${API}/seed-data`);
              toast.success("Sample data added successfully!");
              fetchStats();
            } catch (error) {
              toast.error("Failed to seed data");
            }
          }}
          className="btn-luxury"
          data-testid="seed-data-btn"
        >
          Add Sample Data
        </Button>
      </div>
    </div>
  );
};

// Admin Villas
const AdminVillas = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      const response = await axios.get(`${API}/villas`);
      setVillas(response.data.villas);
    } catch (error) {
      console.error("Error fetching villas:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl">Villas</h1>
        <Button className="btn-luxury" data-testid="add-villa-btn">
          <Plus size={16} className="mr-2" />
          Add Villa
        </Button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : villas.length > 0 ? (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Villa</th>
                <th className="text-left p-4 text-sm font-medium">Location</th>
                <th className="text-left p-4 text-sm font-medium">Capacity</th>
                <th className="text-left p-4 text-sm font-medium">Price/Night</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {villas.map((villa) => (
                <tr key={villa.villa_id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={villa.thumbnail || villa.images?.[0]}
                        alt=""
                        className="w-12 h-12 object-cover"
                      />
                      <span className="font-medium">{villa.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {villa.location}, {villa.region}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {villa.max_guests} guests, {villa.bedrooms} beds
                  </td>
                  <td className="p-4">{formatPrice(villa.base_price)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs ${
                        villa.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {villa.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground mb-4">No villas found</p>
          <Button className="btn-luxury">Add Your First Villa</Button>
        </div>
      )}
    </div>
  );
};

// Admin Bookings
const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data.bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Bookings</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Guest</th>
                <th className="text-left p-4 text-sm font-medium">Villa</th>
                <th className="text-left p-4 text-sm font-medium">Dates</th>
                <th className="text-left p-4 text-sm font-medium">Amount</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.booking_id} className="border-t border-border">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{booking.guest_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{booking.villa_name}</td>
                  <td className="p-4 text-muted-foreground">
                    {booking.check_in} to {booking.check_out}
                  </td>
                  <td className="p-4">{formatPrice(booking.total_amount)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs ${
                        booking.booking_status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : booking.booking_status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {booking.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No bookings yet</p>
        </div>
      )}
    </div>
  );
};

// Admin Leads
const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(response.data.leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Leads & Callbacks</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : leads.length > 0 ? (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.lead_id} className="bg-card border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{lead.name}</h3>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                  {lead.email && (
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs ${
                    lead.lead_type === "homeowner"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {lead.lead_type}
                </span>
              </div>
              {lead.villa_name && (
                <p className="mt-2 text-sm">Interested in: {lead.villa_name}</p>
              )}
              {lead.message && (
                <p className="mt-2 text-sm text-muted-foreground">{lead.message}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No leads yet</p>
        </div>
      )}
    </div>
  );
};

// Admin Owners
const AdminOwners = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/owners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwners(response.data.owners);
    } catch (error) {
      console.error("Error fetching owners:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Villa Owners</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : owners.length > 0 ? (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Owner</th>
                <th className="text-left p-4 text-sm font-medium">Email</th>
                <th className="text-left p-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.user_id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {owner.picture && (
                        <img src={owner.picture} alt="" className="w-8 h-8 rounded-full" />
                      )}
                      <span className="font-medium">{owner.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{owner.email}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No owners registered yet</p>
        </div>
      )}
    </div>
  );
};

// Admin Financials
const AdminFinancials = () => {
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/financials/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFinancials(response.data);
    } catch (error) {
      console.error("Error fetching financials:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Financial Summary</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-6 border border-border animate-pulse">
              <div className="h-4 bg-muted w-1/2 mb-4" />
              <div className="h-8 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
              <p className="font-heading text-3xl">{formatPrice(financials?.total_revenue)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Commission</p>
              <p className="font-heading text-3xl">{formatPrice(financials?.total_commission)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Owner Payouts</p>
              <p className="font-heading text-3xl">{formatPrice(financials?.total_owner_payout)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Security Deposits</p>
              <p className="font-heading text-3xl">{formatPrice(financials?.total_security_deposits)}</p>
            </div>
          </div>

          <Button className="btn-luxury-outline" data-testid="export-financials-btn">
            Export to CSV
          </Button>
        </>
      )}
    </div>
  );
};

// Admin Listings (Homeowner Applications)
const AdminListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/homeowner-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setListings(response.data.listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Homeowner Listing Applications</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted" />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.listing_id} className="bg-card border border-border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-heading text-xl">{listing.villa_name}</h3>
                  <p className="text-muted-foreground">{listing.villa_location}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs ${
                    listing.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : listing.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {listing.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Owner:</span>
                  <p>{listing.owner_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact:</span>
                  <p>{listing.owner_phone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bedrooms:</span>
                  <p>{listing.bedrooms}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pool:</span>
                  <p>{listing.has_pool ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No listing applications yet</p>
        </div>
      )}
    </div>
  );
};

// Razorpay Setup Guide
const RazorpaySetup = () => {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuide();
  }, []);

  const fetchGuide = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/admin/razorpay-setup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGuide(response.data);
    } catch (error) {
      console.error("Error fetching guide:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Razorpay Setup Guide</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-muted" />
          ))}
        </div>
      ) : guide ? (
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-card border border-border p-6">
            <h2 className="font-heading text-xl mb-4">Current Status</h2>
            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 text-sm ${
                  guide.current_status.configured
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {guide.current_status.configured ? "Configured" : "Not Configured"}
              </span>
              {guide.current_status.configured && (
                <span className="text-sm text-muted-foreground">
                  Mode: {guide.current_status.mode}
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          {guide.steps?.map((step) => (
            <div key={step.step} className="bg-card border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-medium mb-2">{step.title}</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Test Cards */}
          <div className="bg-card border border-border p-6">
            <h2 className="font-heading text-xl mb-4">Test Credentials</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Success Card:</span>{" "}
                <code className="bg-muted px-2 py-1">{guide.test_cards?.success}</code>
              </p>
              <p>
                <span className="text-muted-foreground">Failure Card:</span>{" "}
                <code className="bg-muted px-2 py-1">{guide.test_cards?.failure}</code>
              </p>
              <p>
                <span className="text-muted-foreground">Test UPI:</span>{" "}
                <code className="bg-muted px-2 py-1">{guide.test_cards?.upi}</code>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Failed to load setup guide</p>
      )}
    </div>
  );
};

export default AdminDashboard;
