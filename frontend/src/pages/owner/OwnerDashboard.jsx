import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, Calendar, DollarSign, LogOut, Menu, Lock, Unlock,
  ChevronLeft, ChevronRight, Users, Eye, Phone, Mail, Clock, CheckCircle,
  AlertCircle, TrendingUp, CalendarDays, RefreshCw
} from "lucide-react";
import { useAuth, API } from "../../App";
import { Button } from "../../components/ui/button";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose 
} from "../../components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { format, parseISO, addDays, differenceInDays, isBefore, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { getErrorMessage } from "@/lib/utils";

// Helper function
const formatPrice = (price) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price || 0);
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("session_token");
  return { Authorization: `Bearer ${token}` };
};

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
                src="/Travaholic_color_logo-removebg-preview.png" 
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
              data-testid="owner-sidebar-toggle"
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
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: getAuthHeaders(),
      });
      setDashboard(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl">Owner Dashboard</h1>
        <Button variant="outline" onClick={fetchDashboard} className="gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-6 border border-border animate-pulse">
              <div className="h-4 bg-muted w-1/2 mb-4" />
              <div className="h-8 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">My Properties</p>
                <Home size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{dashboard?.villas?.length || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <CalendarDays size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{dashboard?.total_bookings || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <DollarSign size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{formatPrice(dashboard?.total_revenue)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Your Earnings</p>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <p className="font-heading text-3xl mt-2 text-green-600">{formatPrice(dashboard?.total_earnings)}</p>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-xl">Upcoming Bookings</h2>
                <Link to="/owner/calendar" className="text-sm text-accent hover:underline">
                  View Calendar
                </Link>
              </div>
              {dashboard?.upcoming_bookings?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.upcoming_bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.booking_id}
                      className="flex items-center justify-between p-4 bg-muted/30 border border-border"
                    >
                      <div>
                        <p className="font-medium">{booking.villa_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.guest_name} • {booking.num_guests} guests
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar size={12} />
                          {booking.check_in} to {booking.check_out}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded ${
                          booking.booking_status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {booking.booking_status}
                        </span>
                        <p className="text-sm font-medium mt-2">{formatPrice(booking.owner_payout)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No upcoming bookings</p>
                </div>
              )}
            </div>

            {/* My Villas Quick View */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-xl">My Properties</h2>
                <Link to="/owner/villas" className="text-sm text-accent hover:underline">
                  View All
                </Link>
              </div>
              {dashboard?.villas?.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.villas.slice(0, 3).map((villa) => (
                    <div
                      key={villa.villa_id}
                      className="flex items-center gap-4 p-4 bg-muted/30 border border-border"
                    >
                      <img
                        src={villa.thumbnail || villa.images?.[0]}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{villa.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {villa.location}, {villa.region}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(villa.base_price)}/night • {villa.commission_percent}% commission
                        </p>
                      </div>
                      <Link to={`/villas/${villa.slug}`} target="_blank">
                        <Button variant="ghost" size="sm">
                          <Eye size={16} />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No properties assigned</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact admin to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-accent/10 border border-accent/20 p-6">
            <h3 className="font-heading text-lg mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/owner/calendar">
                <Button variant="outline" className="gap-2">
                  <Lock size={16} />
                  Block Dates
                </Button>
              </Link>
              <Link to="/owner/earnings">
                <Button variant="outline" className="gap-2">
                  <DollarSign size={16} />
                  View Earnings
                </Button>
              </Link>
              <a href="https://wa.me/919958871283" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Phone size={16} />
                  Contact Support
                </Button>
              </a>
            </div>
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
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: getAuthHeaders(),
      });
      setVillas(response.data.villas || []);
    } catch (error) {
      console.error("Error fetching villas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">My Properties</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-muted" />
          ))}
        </div>
      ) : villas.length > 0 ? (
        <div className="space-y-6">
          {villas.map((villa) => (
            <div key={villa.villa_id} className="bg-card border border-border overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <img
                  src={villa.thumbnail || villa.images?.[0]}
                  alt={villa.name}
                  className="w-full md:w-64 h-48 md:h-auto object-cover"
                />
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="font-heading text-2xl mb-1">{villa.name}</h2>
                      <p className="text-muted-foreground">{villa.location}, {villa.region}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm ${
                      villa.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {villa.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-6">
                    <div className="bg-muted/50 p-3 rounded">
                      <span className="text-muted-foreground block mb-1">Max Guests</span>
                      <p className="font-medium">{villa.max_guests}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <span className="text-muted-foreground block mb-1">Bedrooms</span>
                      <p className="font-medium">{villa.bedrooms}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <span className="text-muted-foreground block mb-1">Base Price</span>
                      <p className="font-medium">{formatPrice(villa.base_price)}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <span className="text-muted-foreground block mb-1">Weekend Price</span>
                      <p className="font-medium">{formatPrice(villa.weekend_price)}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded">
                      <span className="text-muted-foreground block mb-1">Commission</span>
                      <p className="font-medium">{villa.commission_percent}%</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link to={`/villas/${villa.slug}`} target="_blank">
                      <Button variant="outline" className="gap-2">
                        <Eye size={16} />
                        View Listing
                      </Button>
                    </Link>
                    <Link to="/owner/calendar">
                      <Button variant="outline" className="gap-2">
                        <Calendar size={16} />
                        Manage Calendar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card border border-border">
          <Home size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading text-xl mb-2">No Properties Assigned</h3>
          <p className="text-muted-foreground mb-4">
            Contact the Travaholic Stays team to get your property listed
          </p>
          <a href="https://wa.me/919958871283" target="_blank" rel="noopener noreferrer">
            <Button className="btn-luxury">Contact Us</Button>
          </a>
        </div>
      )}
    </div>
  );
};

// Owner Calendar with Date Range Blocking
const OwnerCalendar = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVilla, setSelectedVilla] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState({ from: null, to: null });
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/owner/dashboard`, {
        headers: getAuthHeaders(),
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

  const getDateStatus = (date) => {
    if (!selectedVilla || !dashboard?.blocked_dates) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    
    const block = dashboard.blocked_dates.find(
      (b) =>
        b.villa_id === selectedVilla.villa_id &&
        dateStr >= b.start_date &&
        dateStr <= b.end_date
    );
    
    if (block) {
      return block.reason === "booking" ? "booked" : "blocked";
    }
    return null;
  };

  const handleDateSelect = (date) => {
    if (!selectedRange.from || (selectedRange.from && selectedRange.to)) {
      // Start new selection
      setSelectedRange({ from: date, to: null });
    } else {
      // Complete the range
      if (isBefore(date, selectedRange.from)) {
        setSelectedRange({ from: date, to: selectedRange.from });
      } else {
        setSelectedRange({ from: selectedRange.from, to: date });
      }
    }
  };

  const handleBlockDates = async () => {
    if (!selectedVilla || !selectedRange.from) return;

    setBlocking(true);
    try {
      const startDate = format(selectedRange.from, "yyyy-MM-dd");
      const endDate = format(selectedRange.to || selectedRange.from, "yyyy-MM-dd");

      await axios.post(
        `${API}/villas/${selectedVilla.villa_id}/block-dates`,
        {
          start_date: startDate,
          end_date: endDate,
          reason: blockReason || "owner_block",
        },
        { headers: getAuthHeaders() }
      );

      toast.success("Dates blocked successfully");
      fetchDashboard();
      setSelectedRange({ from: null, to: null });
      setBlockReason("");
      setShowBlockDialog(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to block dates"));
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockDate = async (blockId) => {
    try {
      await axios.delete(`${API}/blocked-dates/${blockId}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Date unblocked");
      fetchDashboard();
    } catch (error) {
      toast.error("Failed to unblock date");
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset
  const firstDayOffset = monthStart.getDay();

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Booking Calendar</h1>

      {loading ? (
        <div className="animate-pulse h-96 bg-muted" />
      ) : dashboard?.villas?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Villa Selection & Legend */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="font-medium mb-4">Select Property</h2>
              <div className="space-y-2">
                {dashboard.villas.map((villa) => (
                  <button
                    key={villa.villa_id}
                    onClick={() => {
                      setSelectedVilla(villa);
                      setSelectedRange({ from: null, to: null });
                    }}
                    className={`w-full text-left p-4 border transition-colors ${
                      selectedVilla?.villa_id === villa.villa_id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <p className="font-medium">{villa.name}</p>
                    <p className="text-sm text-muted-foreground">{villa.location}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-card border border-border p-4">
              <h3 className="font-medium mb-3">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>Booked (Guest)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>Blocked by You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-accent/30 border border-accent rounded" />
                  <span>Selected</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 border border-border p-4 text-sm">
              <p className="font-medium mb-2">How to block dates:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click on a start date</li>
                <li>Click on an end date</li>
                <li>Click "Block Selected Dates"</li>
              </ol>
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                  className="p-2 hover:bg-muted rounded"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="font-heading text-2xl">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <button
                  onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                  className="p-2 hover:bg-muted rounded"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-6">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for offset */}
                {[...Array(firstDayOffset)].map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {/* Days */}
                {days.map((day) => {
                  const status = getDateStatus(day);
                  const isSelected = selectedRange.from && 
                    (isSameDay(day, selectedRange.from) || 
                     (selectedRange.to && day >= selectedRange.from && day <= selectedRange.to));
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => !isPast && !status && handleDateSelect(day)}
                      disabled={isPast || status === "booked"}
                      className={`
                        aspect-square p-2 text-sm rounded relative
                        ${isPast ? "text-muted-foreground/50 cursor-not-allowed" : ""}
                        ${status === "booked" ? "bg-green-500 text-white cursor-not-allowed" : ""}
                        ${status === "blocked" ? "bg-red-500 text-white hover:bg-red-600" : ""}
                        ${isSelected && !status ? "bg-accent/30 border-2 border-accent" : ""}
                        ${!status && !isPast && !isSelected ? "hover:bg-muted" : ""}
                        ${isToday(day) ? "ring-2 ring-accent ring-offset-2" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              {/* Selected Range Actions */}
              {selectedRange.from && (
                <div className="border-t border-border pt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected dates:</p>
                      <p className="font-medium">
                        {format(selectedRange.from, "MMM d, yyyy")}
                        {selectedRange.to && ` - ${format(selectedRange.to, "MMM d, yyyy")}`}
                        {selectedRange.to && (
                          <span className="text-muted-foreground ml-2">
                            ({differenceInDays(selectedRange.to, selectedRange.from) + 1} nights)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedRange({ from: null, to: null })}
                      >
                        Clear
                      </Button>
                      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                        <DialogTrigger asChild>
                          <Button className="btn-luxury gap-2">
                            <Lock size={16} />
                            Block Selected Dates
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Block Dates</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Blocking dates for:</p>
                              <p className="font-medium">{selectedVilla?.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Date range:</p>
                              <p className="font-medium">
                                {format(selectedRange.from, "MMM d, yyyy")}
                                {selectedRange.to && ` - ${format(selectedRange.to, "MMM d, yyyy")}`}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Reason (optional)</label>
                              <Input
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="e.g., Personal use, Maintenance"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button 
                              onClick={handleBlockDates} 
                              disabled={blocking}
                              className="btn-luxury"
                            >
                              {blocking ? "Blocking..." : "Confirm Block"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Blocked Dates List */}
            {selectedVilla && dashboard?.blocked_dates?.filter(b => 
              b.villa_id === selectedVilla.villa_id && b.reason !== "booking"
            ).length > 0 && (
              <div className="mt-6 bg-card border border-border p-6">
                <h3 className="font-heading text-lg mb-4">Your Blocked Dates</h3>
                <div className="space-y-3">
                  {dashboard.blocked_dates
                    .filter(b => b.villa_id === selectedVilla.villa_id && b.reason !== "booking")
                    .map((block) => (
                      <div 
                        key={block.block_id} 
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded"
                      >
                        <div>
                          <p className="font-medium">
                            {block.start_date} to {block.end_date}
                          </p>
                          {block.reason && block.reason !== "owner_block" && (
                            <p className="text-sm text-muted-foreground">{block.reason}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUnblockDate(block.block_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          <Unlock size={16} className="mr-1" />
                          Unblock
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-card border border-border">
          <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
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
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API}/financials/owner/${user?.user_id}`, {
        headers: getAuthHeaders(),
      });
      setEarnings(response.data);
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="font-heading text-3xl">Earnings</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
              <p className="font-heading text-3xl">{earnings?.bookings?.length || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
              <p className="font-heading text-3xl">{formatPrice(earnings?.total_revenue)}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Commission Paid</p>
              <p className="font-heading text-3xl text-muted-foreground">{formatPrice(earnings?.total_commission)}</p>
            </div>
            <div className="bg-gradient-to-r from-accent/20 to-accent/10 p-6 border border-accent">
              <p className="text-sm text-muted-foreground mb-2">Your Earnings</p>
              <p className="font-heading text-3xl text-accent">{formatPrice(earnings?.total_payout)}</p>
            </div>
          </div>

          {/* How Earnings Work */}
          <div className="bg-muted/30 border border-border p-6 mb-8">
            <h3 className="font-heading text-lg mb-4">How Your Earnings Work</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <p className="font-medium">Guest Books</p>
                  <p className="text-muted-foreground">Guest pays the full booking amount</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <p className="font-medium">Commission Deducted</p>
                  <p className="text-muted-foreground">Travaholic Stays deducts the agreed commission %</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <p className="font-medium">You Get Paid</p>
                  <p className="text-muted-foreground">Remaining amount is transferred to you</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking History */}
          <div>
            <h2 className="font-heading text-xl mb-4">Booking History</h2>
            {earnings?.bookings?.length > 0 ? (
              <div className="bg-card border border-border overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Villa</th>
                      <th className="text-left p-4 text-sm font-medium">Guest</th>
                      <th className="text-left p-4 text-sm font-medium">Dates</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-right p-4 text-sm font-medium">Revenue</th>
                      <th className="text-right p-4 text-sm font-medium">Commission</th>
                      <th className="text-right p-4 text-sm font-medium">Your Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.bookings.map((booking) => (
                      <tr key={booking.booking_id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-4 font-medium">{booking.villa_name}</td>
                        <td className="p-4 text-muted-foreground">{booking.guest_name}</td>
                        <td className="p-4 text-muted-foreground text-sm">
                          {booking.check_in} - {booking.check_out}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            booking.booking_status === "confirmed" ? "bg-green-100 text-green-800" :
                            booking.booking_status === "completed" ? "bg-blue-100 text-blue-800" :
                            booking.booking_status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {booking.booking_status}
                          </span>
                        </td>
                        <td className="p-4 text-right">{formatPrice(booking.subtotal)}</td>
                        <td className="p-4 text-right text-muted-foreground">
                          -{formatPrice(booking.commission_amount)}
                        </td>
                        <td className="p-4 text-right font-medium text-green-600">
                          {formatPrice(booking.owner_payout)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 bg-card border border-border">
                <DollarSign size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No earnings yet</p>
                <p className="text-sm text-muted-foreground">
                  Your earnings will appear here once guests book your property
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerDashboard;
