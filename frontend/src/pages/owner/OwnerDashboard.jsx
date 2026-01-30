import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, Calendar, DollarSign, LogOut, Menu, Lock, Unlock
} from "lucide-react";
import { useAuth, API } from "../../App";
import { Button } from "../../components/ui/button";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { toast } from "sonner";
import axios from "axios";
import { format, parseISO, isSameDay } from "date-fns";

// Owner Dashboard Component
const OwnerDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/owner" },
    { icon: Home, label: "My Villas", path: "/owner/villas" },
    { icon: Calendar, label: "Calendar", path: "/owner/calendar" },
    { icon: DollarSign, label: "Earnings", path: "/owner/earnings" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30" data-testid="owner-dashboard">
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
                src="https://customer-assets.emergentagent.com/job_villas-dashboard/artifacts/chkp86q1_Travaholic_color_logo-removebg-preview.png" 
                alt="Travaholic Stays"
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-xs text-background/60 mt-2">Owner Portal</p>
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
              data-testid="owner-logout-btn"
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
            <Route index element={<OwnerOverview />} />
            <Route path="villas" element={<OwnerVillas />} />
            <Route path="calendar" element={<OwnerCalendar />} />
            <Route path="earnings" element={<OwnerEarnings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Owner Overview
const OwnerOverview = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
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
      <h1 className="font-heading text-3xl mb-8">Owner Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card p-6 border border-border animate-pulse">
              <div className="h-4 bg-muted w-1/2 mb-4" />
              <div className="h-8 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">My Properties</p>
              <p className="font-heading text-3xl">{dashboard?.villas?.length || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
              <p className="font-heading text-3xl">{dashboard?.total_bookings || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
              <p className="font-heading text-3xl">{formatPrice(dashboard?.total_earnings)}</p>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="mb-8">
            <h2 className="font-heading text-xl mb-4">Upcoming Bookings</h2>
            {dashboard?.upcoming_bookings?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.upcoming_bookings.map((booking) => (
                  <div
                    key={booking.booking_id}
                    className="bg-card border border-border p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{booking.villa_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.check_in} to {booking.check_out}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs ${
                        booking.booking_status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {booking.booking_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming bookings</p>
            )}
          </div>

          {/* My Villas */}
          <div>
            <h2 className="font-heading text-xl mb-4">My Properties</h2>
            {dashboard?.villas?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.villas.map((villa) => (
                  <div
                    key={villa.villa_id}
                    className="bg-card border border-border p-4 flex items-center gap-4"
                  >
                    <img
                      src={villa.thumbnail || villa.images?.[0]}
                      alt=""
                      className="w-16 h-16 object-cover"
                    />
                    <div>
                      <p className="font-medium">{villa.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {villa.location}, {villa.region}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No properties assigned</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Owner Villas
const OwnerVillas = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVillas(response.data.villas || []);
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
      <h1 className="font-heading text-3xl mb-8">My Properties</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 bg-muted" />
          ))}
        </div>
      ) : villas.length > 0 ? (
        <div className="space-y-6">
          {villas.map((villa) => (
            <div key={villa.villa_id} className="bg-card border border-border overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <img
                  src={villa.thumbnail || villa.images?.[0]}
                  alt=""
                  className="w-full md:w-48 h-48 object-cover"
                />
                <div className="p-6 flex-1">
                  <h2 className="font-heading text-xl mb-2">{villa.name}</h2>
                  <p className="text-muted-foreground mb-4">
                    {villa.location}, {villa.region}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Guests:</span>
                      <p>{villa.max_guests}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bedrooms:</span>
                      <p>{villa.bedrooms}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Base Price:</span>
                      <p>{formatPrice(villa.base_price)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commission:</span>
                      <p>{villa.commission_percent}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground mb-4">No properties assigned to your account</p>
          <p className="text-sm text-muted-foreground">
            Contact admin to get your property listed
          </p>
        </div>
      )}
    </div>
  );
};

// Owner Calendar
const OwnerCalendar = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVilla, setSelectedVilla] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(response.data);
      if (response.data.villas?.length > 0) {
        setSelectedVilla(response.data.villas[0]);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDateBlocked = (date) => {
    if (!selectedVilla || !dashboard?.blocked_dates) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return dashboard.blocked_dates.some(
      (block) =>
        block.villa_id === selectedVilla.villa_id &&
        dateStr >= block.start_date &&
        dateStr <= block.end_date
    );
  };

  const isDateBooked = (date) => {
    if (!selectedVilla || !dashboard?.blocked_dates) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return dashboard.blocked_dates.some(
      (block) =>
        block.villa_id === selectedVilla.villa_id &&
        block.reason === "booking" &&
        dateStr >= block.start_date &&
        dateStr <= block.end_date
    );
  };

  const handleBlockDate = async () => {
    if (!selectedVilla || !selectedDate) return;

    setBlocking(true);
    try {
      const token = localStorage.getItem("session_token");
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      await axios.post(
        `${API}/villas/${selectedVilla.villa_id}/block-dates`,
        {
          start_date: dateStr,
          end_date: dateStr,
          reason: "owner_block",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Date blocked successfully");
      fetchDashboard();
      setSelectedDate(null);
    } catch (error) {
      toast.error("Failed to block date");
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Booking Calendar</h1>

      {loading ? (
        <div className="animate-pulse h-96 bg-muted" />
      ) : dashboard?.villas?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Villa Selection */}
          <div className="lg:col-span-1">
            <h2 className="font-medium mb-4">Select Property</h2>
            <div className="space-y-2">
              {dashboard.villas.map((villa) => (
                <button
                  key={villa.villa_id}
                  onClick={() => setSelectedVilla(villa)}
                  className={`w-full text-left p-4 border transition-colors ${
                    selectedVilla?.villa_id === villa.villa_id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent"
                  }`}
                >
                  <p className="font-medium">{villa.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {villa.location}
                  </p>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500" />
                <span>Blocked</span>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border p-6">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="mx-auto"
                modifiers={{
                  booked: (date) => isDateBooked(date),
                  blocked: (date) => isDateBlocked(date) && !isDateBooked(date),
                }}
                modifiersStyles={{
                  booked: { backgroundColor: "#22c55e", color: "white" },
                  blocked: { backgroundColor: "#ef4444", color: "white" },
                }}
              />

              {selectedDate && !isDateBooked(selectedDate) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm mb-4">
                    Selected: {format(selectedDate, "MMMM d, yyyy")}
                  </p>
                  {isDateBlocked(selectedDate) ? (
                    <p className="text-sm text-muted-foreground">
                      This date is blocked. Contact admin to unblock.
                    </p>
                  ) : (
                    <Button
                      onClick={handleBlockDate}
                      disabled={blocking}
                      className="btn-luxury-outline"
                      data-testid="block-date-btn"
                    >
                      <Lock size={16} className="mr-2" />
                      {blocking ? "Blocking..." : "Block This Date"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No properties assigned</p>
        </div>
      )}
    </div>
  );
};

// Owner Earnings
const OwnerEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem("session_token");
      const response = await axios.get(`${API}/financials/owner/${user?.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEarnings(response.data);
    } catch (error) {
      console.error("Error fetching earnings:", error);
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
      <h1 className="font-heading text-3xl mb-8">Earnings</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card p-6 border border-border animate-pulse">
              <div className="h-4 bg-muted w-1/2 mb-4" />
              <div className="h-8 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
              <p className="font-heading text-3xl">{formatPrice(earnings?.total_revenue)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Commission Paid</p>
              <p className="font-heading text-3xl">{formatPrice(earnings?.total_commission)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Your Earnings</p>
              <p className="font-heading text-3xl text-accent">
                {formatPrice(earnings?.total_payout)}
              </p>
            </div>
          </div>

          {/* Booking History */}
          <div>
            <h2 className="font-heading text-xl mb-4">Booking History</h2>
            {earnings?.bookings?.length > 0 ? (
              <div className="bg-card border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Villa</th>
                      <th className="text-left p-4 text-sm font-medium">Dates</th>
                      <th className="text-left p-4 text-sm font-medium">Revenue</th>
                      <th className="text-left p-4 text-sm font-medium">Commission</th>
                      <th className="text-left p-4 text-sm font-medium">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.bookings.map((booking) => (
                      <tr key={booking.booking_id} className="border-t border-border">
                        <td className="p-4">{booking.villa_name}</td>
                        <td className="p-4 text-muted-foreground">
                          {booking.check_in} - {booking.check_out}
                        </td>
                        <td className="p-4">{formatPrice(booking.subtotal)}</td>
                        <td className="p-4 text-muted-foreground">
                          {formatPrice(booking.commission_amount)}
                        </td>
                        <td className="p-4 text-accent">{formatPrice(booking.owner_payout)}</td>
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
        </>
      )}
    </div>
  );
};

export default OwnerDashboard;
