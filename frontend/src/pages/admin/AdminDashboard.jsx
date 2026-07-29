import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, Calendar, Users, DollarSign, MessageSquare,
  Settings, LogOut, Menu, X, Plus, ChevronDown, FileText, Building,
  Edit, Trash2, Eye, Check, Phone, Mail, Search, Filter, Download,
  AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, BookOpen, Image, Tag, Ticket, Percent,
  Upload, Star, ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth, API, BACKEND_URL } from "../../App";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "../../components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { getErrorMessage } from "@/lib/utils";

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
    { icon: FileText, label: "Private Offers", path: "/admin/offers" },
    { icon: Ticket, label: "Coupons", path: "/admin/coupons" },
    { icon: MessageSquare, label: "Leads", path: "/admin/leads" },
    { icon: Users, label: "Owners", path: "/admin/owners" },
    { icon: Users, label: "Team", path: "/admin/team" },
    { icon: DollarSign, label: "Payouts", path: "/admin/payouts" },
    { icon: Clock, label: "Event Pricing", path: "/admin/pricing" },
    { icon: BookOpen, label: "Blog", path: "/admin/blog" },
    { icon: Building, label: "Listings", path: "/admin/listings" },
    { icon: Settings, label: "Razorpay Setup", path: "/admin/razorpay" },
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
                src="/Travaholic_color_logo-removebg-preview.png" 
                alt="Travaholic Stays"
                className="h-14 w-auto"
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
            <Route path="offers" element={<AdminPrivateOffers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="owners" element={<AdminOwners />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="pricing" element={<AdminEventPricing />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="razorpay" element={<RazorpaySetup />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

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

// Admin Overview
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const [villasRes, bookingsRes, leadsRes, financialsRes] = await Promise.all([
        axios.get(`${API}/villas`, { headers }),
        axios.get(`${API}/bookings?limit=5`, { headers }),
        axios.get(`${API}/leads?limit=5`, { headers }),
        axios.get(`${API}/financials/summary`, { headers }),
      ]);

      setStats({
        totalVillas: villasRes.data.total,
        totalBookings: bookingsRes.data.total,
        totalLeads: leadsRes.data.total,
        totalRevenue: financialsRes.data.total_revenue,
        totalCommission: financialsRes.data.total_commission,
        pendingBookings: bookingsRes.data.bookings?.filter(b => b.booking_status === 'pending').length || 0,
        newLeads: leadsRes.data.leads?.filter(l => l.status === 'new').length || 0,
      });
      setRecentBookings(bookingsRes.data.bookings || []);
      setRecentLeads(leadsRes.data.leads || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl">Dashboard Overview</h1>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Villas</p>
                <Home size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{stats?.totalVillas || 0}</p>
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <Calendar size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{stats?.totalBookings || 0}</p>
              {stats?.pendingBookings > 0 && (
                <p className="text-xs text-amber-600 mt-1">{stats.pendingBookings} pending</p>
              )}
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <MessageSquare size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{stats?.totalLeads || 0}</p>
              {stats?.newLeads > 0 && (
                <p className="text-xs text-blue-600 mt-1">{stats.newLeads} new</p>
              )}
            </div>
            <div className="bg-card p-6 border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <DollarSign size={20} className="text-accent" />
              </div>
              <p className="font-heading text-3xl mt-2">{formatPrice(stats?.totalCommission)}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bookings */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-xl">Recent Bookings</h2>
                <Link to="/admin/bookings" className="text-sm text-accent hover:underline">
                  View All
                </Link>
              </div>
              {recentBookings.length > 0 ? (
                <div className="space-y-3">
                  {recentBookings.slice(0, 5).map((booking) => (
                    <div key={booking.booking_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{booking.guest_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.villa_name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.booking_status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No bookings yet</p>
              )}
            </div>

            {/* Recent Leads */}
            <div className="bg-card border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-xl">Recent Leads</h2>
                <Link to="/admin/leads" className="text-sm text-accent hover:underline">
                  View All
                </Link>
              </div>
              {recentLeads.length > 0 ? (
                <div className="space-y-3">
                  {recentLeads.slice(0, 5).map((lead) => (
                    <div key={lead.lead_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        lead.lead_type === 'homeowner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.lead_type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No leads yet</p>
              )}
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
                  fetchData();
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

          {/* Blog Posts Import Button */}
          <div className="mt-6 p-6 bg-accent/10 border border-accent/20">
            <h3 className="font-heading text-lg mb-2">Launch Blog Posts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              One-click import of 5 ready-to-publish blog posts. Safe to click more than once.
            </p>
            <Button
              onClick={async () => {
                try {
                  const response = await axios.post(`${API}/admin/seed-blog-posts`, {}, { headers: getAuthHeaders() });
                  toast.success(`Blog posts imported (${response.data.inserted} new, ${response.data.updated} updated)`);
                } catch (error) {
                  toast.error(getErrorMessage(error, "Failed to import blog posts"));
                }
              }}
              className="btn-luxury"
              data-testid="seed-blog-btn"
            >
              Import Blog Posts
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// Admin Villas with CRUD
const AdminVillas = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingVilla, setEditingVilla] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleDelete = async (villaId) => {
    if (!confirm("Are you sure you want to delete this villa?")) return;
    try {
      await axios.delete(`${API}/villas/${villaId}`, { headers: getAuthHeaders() });
      toast.success("Villa deleted successfully");
      fetchVillas();
    } catch (error) {
      toast.error("Failed to delete villa");
    }
  };

  const handleToggleStatus = async (villa) => {
    try {
      await axios.put(`${API}/villas/${villa.villa_id}`, 
        { is_active: !villa.is_active },
        { headers: getAuthHeaders() }
      );
      toast.success(`Villa ${villa.is_active ? 'deactivated' : 'activated'}`);
      fetchVillas();
    } catch (error) {
      toast.error("Failed to update villa status");
    }
  };

  const filteredVillas = villas.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="font-heading text-3xl">Villas Management</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search villas..." 
              className="pl-9 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="btn-luxury" data-testid="add-villa-btn">
                <Plus size={16} className="mr-2" />
                Add Villa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Villa</DialogTitle>
              </DialogHeader>
              <VillaForm onSuccess={() => { setShowAddModal(false); fetchVillas(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : filteredVillas.length > 0 ? (
        <div className="bg-card border border-border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Villa</th>
                <th className="text-left p-4 text-sm font-medium">Location</th>
                <th className="text-left p-4 text-sm font-medium">Capacity</th>
                <th className="text-left p-4 text-sm font-medium">Price/Night</th>
                <th className="text-left p-4 text-sm font-medium">Commission</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
                <th className="text-left p-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVillas.map((villa) => (
                <tr key={villa.villa_id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={villa.thumbnail || villa.images?.[0] || '/placeholder.jpg'}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <span className="font-medium">{villa.name}</span>
                        <p className="text-xs text-muted-foreground">{villa.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {villa.location}, {villa.region}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {villa.max_guests}G / {villa.bedrooms}B
                  </td>
                  <td className="p-4">{formatPrice(villa.base_price)}</td>
                  <td className="p-4">{villa.commission_percent}%</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(villa)}
                      className={`px-2 py-1 text-xs rounded cursor-pointer ${
                        villa.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {villa.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link to={`/villas/${villa.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" title="View">
                          <Eye size={16} />
                        </Button>
                      </Link>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditingVilla(villa)}>
                            <Edit size={16} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Villa</DialogTitle>
                          </DialogHeader>
                          <VillaForm villa={villa} onSuccess={() => { setEditingVilla(null); fetchVillas(); }} />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(villa.villa_id)}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground mb-4">No villas found</p>
          <Button className="btn-luxury" onClick={() => setShowAddModal(true)}>Add Your First Villa</Button>
        </div>
      )}
    </div>
  );
};

// Standardized amenity options, grouped for readability - drawn from what's
// actually used across the real villa portfolio so nothing gets missed or
// entered inconsistently (e.g. "WiFi" vs "wifi" vs "Wi-Fi").
const AMENITY_GROUPS = {
  "Comfort": ["Air Conditioning", "High-Speed WiFi", "Smart TV", "Sound Dock", "Generator Backup"],
  "Kitchen & Dining": ["Fully Equipped Kitchen", "Microwave & Oven", "Chef Service", "Breakfast Service"],
  "Pool & Outdoors": ["Private Pool", "Heated Pool", "Garden", "Parking"],
  "Service & Staff": ["Daily Housekeeping", "Butler Service", "Concierge Service", "Caretaker", "Travel Desk", "In-villa Spa Service"],
  "Practical": ["24/7 Security", "Locker Available", "Washing Machine", "Baby Cot Available", "High-end Toiletries"],
};

// Villa Form Component
const VillaForm = ({ villa, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: villa?.name || "",
    slug: villa?.slug || "",
    description: villa?.description || "",
    short_description: villa?.short_description || "",
    location: villa?.location || "",
    region: villa?.region || "Goa",
    address: villa?.address || "",
    map_link: villa?.map_link || "",
    max_guests: villa?.max_guests || 6,
    bedrooms: villa?.bedrooms || 3,
    bathrooms: villa?.bathrooms || 3,
    base_price: villa?.base_price || 25000,
    weekend_price: villa?.weekend_price || 30000,
    minimum_nights: villa?.minimum_nights || 2,
    security_deposit: villa?.security_deposit || 20000,
    commission_percent: villa?.commission_percent || 30,
    amenities: villa?.amenities || [],
    thumbnail: villa?.thumbnail || "",
    images: villa?.images || [],
    video_url: villa?.video_url || "",
    bookings_open_from: villa?.bookings_open_from || "",
    airbnb_ical_url: villa?.airbnb_ical_url || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncingAirbnb, setSyncingAirbnb] = useState(false);

  const syncAirbnbCalendar = async () => {
    setSyncingAirbnb(true);
    try {
      const response = await axios.post(`${API}/admin/villas/${villa.villa_id}/sync-airbnb-calendar`, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to sync Airbnb calendar"));
    } finally {
      setSyncingAirbnb(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await axios.post(`${API}/admin/upload-image`, form, {
          headers: getAuthHeaders(),
        });
        const fullUrl = `${BACKEND_URL}${response.data.url}`;
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, fullUrl],
          thumbnail: prev.thumbnail || fullUrl,
        }));
      }
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload image"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (url) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i !== url),
      thumbnail: prev.thumbnail === url ? (prev.images.find((i) => i !== url) || "") : prev.thumbnail,
    }));
  };

  // The label shown under each photo is just its filename, decoded from
  // the URL - editing it renames that last path segment (directory/host
  // untouched). Only meaningful for statically-hosted villa photos; images
  // uploaded through this form get an opaque /api/images/{id} URL with no
  // real filename to rename.
  const labelFromUrl = (url) => {
    try {
      const path = new URL(url, window.location.origin).pathname;
      return decodeURIComponent(path.split("/").pop() || "");
    } catch {
      return url;
    }
  };

  const handleRelabelImage = (url, newLabel) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === labelFromUrl(url)) return;
    const newUrl = url.replace(/[^/]+$/, encodeURIComponent(trimmed));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((i) => (i === url ? newUrl : i)),
      thumbnail: prev.thumbnail === url ? newUrl : prev.thumbnail,
    }));
  };

  const handleSetThumbnail = (url) => {
    setFormData((prev) => ({ ...prev, thumbnail: url }));
  };

  // The order photos appear in here drives both the gallery order and
  // which one opens first on the villa page (whichever is the thumbnail,
  // wherever it sits in this order).
  const moveImage = (index, direction) => {
    const newIndex = index + direction;
    setFormData((prev) => {
      if (newIndex < 0 || newIndex >= prev.images.length) return prev;
      const images = [...prev.images];
      [images[index], images[newIndex]] = [images[newIndex], images[index]];
      return { ...prev, images };
    });
  };

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        has_pool: formData.amenities.includes("Private Pool") || formData.amenities.includes("Heated Pool"),
        slug: formData.slug || generateSlug(formData.name),
      };

      if (villa) {
        await axios.put(`${API}/villas/${villa.villa_id}`, payload, { headers: getAuthHeaders() });
        toast.success("Villa updated successfully");
      } else {
        await axios.post(`${API}/villas`, payload, { headers: getAuthHeaders() });
        toast.success("Villa created successfully");
      }
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save villa"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Villa Name *</label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
            required 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input 
            value={formData.slug} 
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Location *</label>
          <Input 
            value={formData.location} 
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Anjuna"
            required 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Region</label>
          <Select value={formData.region} onValueChange={(v) => setFormData({ ...formData, region: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Goa">Goa</SelectItem>
              <SelectItem value="Mussoorie">Mussoorie</SelectItem>
              <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Full Address</label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g., SY. No, 377/1, Anjuna, Goa 403509"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Google Maps Link</label>
          <p className="text-xs text-muted-foreground mb-1">Paste a full Google Maps URL (not a maps.app.goo.gl short link) - the pin coordinates are pulled from it automatically.</p>
          <Input
            value={formData.map_link}
            onChange={(e) => setFormData({ ...formData, map_link: e.target.value })}
            placeholder="https://www.google.com/maps/place/..."
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Short Description</label>
        <Input 
          value={formData.short_description} 
          onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Full Description *</label>
        <Textarea 
          value={formData.description} 
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required 
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Max Guests</label>
          <Input type="number" value={formData.max_guests} onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Bedrooms</label>
          <Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Bathrooms</label>
          <Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Base Price (₹/night)</label>
          <Input type="number" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Weekend Price</label>
          <Input type="number" value={formData.weekend_price} onChange={(e) => setFormData({ ...formData, weekend_price: parseFloat(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Min Nights</label>
          <Input type="number" value={formData.minimum_nights} onChange={(e) => setFormData({ ...formData, minimum_nights: parseInt(e.target.value) })} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Bookings Open From</label>
        <p className="text-xs text-muted-foreground mb-2">
          Guests can't select a check-in date before this. Leave empty to accept bookings from any date.
        </p>
        <Input type="date" value={formData.bookings_open_from} onChange={(e) => setFormData({ ...formData, bookings_open_from: e.target.value })} />
      </div>

      <div className="border border-border rounded-md p-4 space-y-3">
        <p className="text-sm font-medium">Airbnb Calendar Sync</p>
        {villa && (
          <div>
            <label className="text-xs text-muted-foreground">Travaholic's calendar feed (paste into Airbnb → Sync calendars → Import calendar)</label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={`${BACKEND_URL}/api/villas/${villa.villa_id}/calendar.ics`} className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${BACKEND_URL}/api/villas/${villa.villa_id}/calendar.ics`);
                  toast.success("Copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground">Airbnb's export calendar link for this listing (from the same Airbnb settings page)</label>
          <Input
            value={formData.airbnb_ical_url}
            onChange={(e) => setFormData({ ...formData, airbnb_ical_url: e.target.value })}
            placeholder="https://www.airbnb.com/calendar/ical/....ics"
            className="mt-1"
          />
        </div>
        {villa && (
          <Button type="button" variant="outline" size="sm" onClick={syncAirbnbCalendar} disabled={syncingAirbnb || !formData.airbnb_ical_url}>
            {syncingAirbnb ? "Syncing..." : "Sync Now"}
          </Button>
        )}
        {!villa && (
          <p className="text-xs text-muted-foreground">Save this villa first, then come back here to get its calendar feed URL and sync from Airbnb.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Security Deposit (₹)</label>
          <Input type="number" value={formData.security_deposit} onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Commission %</label>
          <Input type="number" value={formData.commission_percent} onChange={(e) => setFormData({ ...formData, commission_percent: parseFloat(e.target.value) })} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Amenities</label>
        <p className="text-xs text-muted-foreground mb-2">
          Check everything that applies to this villa.
        </p>
        <div className="space-y-4 border border-border rounded-md p-4">
          {Object.entries(AMENITY_GROUPS).map(([group, options]) => (
            <div key={group}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {options.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Photos</label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload photos, then click one to set it as the thumbnail shown on villa cards.
        </p>

        <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md p-4 cursor-pointer hover:border-accent transition-colors text-sm text-muted-foreground">
          <Upload size={16} />
          {uploading ? "Uploading..." : "Click to upload images"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {formData.images.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {formData.images.map((url, index) => (
              <div key={url} className="relative group">
                <button
                  type="button"
                  onClick={() => handleSetThumbnail(url)}
                  className={`block w-full aspect-square overflow-hidden rounded-md border-2 ${
                    formData.thumbnail === url ? "border-accent" : "border-transparent"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetThumbnail(url)}
                  title={formData.thumbnail === url ? "Opens first on the villa page" : "Set as opening photo"}
                  className={`absolute top-1 left-1 rounded-full p-1 transition-colors ${
                    formData.thumbnail === url
                      ? "bg-accent text-accent-foreground"
                      : "bg-foreground/60 text-background/80 opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Star size={10} fill={formData.thumbnail === url ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  title="Remove photo"
                  className="absolute top-1 right-1 bg-foreground/80 text-background rounded-full p-1 hover:bg-destructive transition-colors"
                >
                  <X size={10} />
                </button>
                <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    title="Move earlier"
                    className="bg-foreground/80 text-background rounded-full p-1 disabled:opacity-30 hover:bg-accent"
                  >
                    <ChevronLeft size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === formData.images.length - 1}
                    title="Move later"
                    className="bg-foreground/80 text-background rounded-full p-1 disabled:opacity-30 hover:bg-accent"
                  >
                    <ChevronRight size={10} />
                  </button>
                </div>
                <input
                  type="text"
                  defaultValue={labelFromUrl(url)}
                  onBlur={(e) => handleRelabelImage(url, e.target.value)}
                  title="Filename shown in the image URL - edit to rename"
                  className="mt-1 w-full text-[10px] text-muted-foreground bg-transparent border-none px-0 truncate focus:outline-none focus:ring-1 focus:ring-accent rounded"
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Click the star to set which photo opens first on the villa page. Hover a photo to reveal arrows for reordering the rest of the gallery.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Video URL</label>
        <p className="text-xs text-muted-foreground mb-2">
          Link to a hosted video (YouTube, Vimeo, or a direct video file) - shown on the villa's page.
        </p>
        <Input
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" className="btn-luxury" disabled={submitting}>
          {submitting ? "Saving..." : (villa ? "Update Villa" : "Create Villa")}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Admin Bookings with status management and manual booking
const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  useEffect(() => {
    fetchBookings();
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      const response = await axios.get(`${API}/villas`);
      setVillas(response.data.villas || []);
    } catch (error) {
      console.error("Error fetching villas:", error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`, { headers: getAuthHeaders() });
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, { booking_status: status }, { headers: getAuthHeaders() });
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  const openEditModal = (booking) => {
    setEditFormData({
      booking_id: booking.booking_id,
      guest_name: booking.guest_name || "",
      guest_email: booking.guest_email || "",
      guest_phone: booking.guest_phone || "",
      check_in: booking.check_in || "",
      check_out: booking.check_out || "",
      num_guests: booking.num_guests || 1,
      total_booking_amount: booking.total_booking_amount || booking.total_amount || 0,
      security_deposit: booking.security_deposit || 0,
      commission_percent: booking.commission_percent ?? "",
    });
    setShowEditModal(true);
  };

  const saveEditedBooking = async () => {
    try {
      const { booking_id, ...payload } = editFormData;
      if (payload.commission_percent === "") delete payload.commission_percent;
      else payload.commission_percent = parseFloat(payload.commission_percent);
      await axios.put(`${API}/bookings/${booking_id}`, payload, { headers: getAuthHeaders() });
      toast.success("Booking updated");
      setShowEditModal(false);
      fetchBookings();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update booking"));
    }
  };

  const [paymentModalData, setPaymentModalData] = useState({
    bookingId: null,
    paymentType: 'advance',
    amount: 0,
    paymentMode: 'upi'
  });

  const openPaymentModal = (booking, paymentType) => {
    setPaymentModalData({
      bookingId: booking.booking_id,
      paymentType: paymentType,
      amount: paymentType === 'advance' 
        ? (booking.advance_amount || Math.round((booking.total_booking_amount || booking.total_amount) * 0.5))
        : (booking.balance_amount || booking.total_booking_amount || booking.total_amount),
      paymentMode: 'upi'
    });
    setShowPaymentModal(true);
  };

  const markPaymentReceived = async () => {
    try {
      const { bookingId, paymentType, amount, paymentMode } = paymentModalData;
      let url = `${API}/admin/bookings/${bookingId}/mark-payment?payment_type=${paymentType}&send_confirmation=true&payment_mode=${paymentMode}`;
      if (amount) url += `&amount=${amount}`;
      
      const response = await axios.post(url, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
      if (response.data.confirmation_sent) {
        toast.success("Confirmation email sent!");
      }
      fetchBookings();
      setShowPaymentModal(false);
    } catch (error) {
      toast.error("Failed to mark payment");
    }
  };

  const downloadConfirmationPDF = async (bookingId) => {
    try {
      const response = await axios.get(`${API}/admin/bookings/${bookingId}/confirmation-pdf`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking_confirmation_${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  const getWhatsAppLink = async (bookingId) => {
    try {
      const response = await axios.get(`${API}/admin/bookings/${bookingId}/whatsapp-message`, {
        headers: getAuthHeaders()
      });
      window.open(response.data.whatsapp_link, '_blank');
    } catch (error) {
      toast.error("Failed to generate WhatsApp link");
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === "all" || b.booking_status === statusFilter;
    const matchesSearch = b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.villa_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.guest_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
  };

  const paymentStatusColors = {
    pending: "bg-gray-100 text-gray-800",
    advance_received: "bg-orange-100 text-orange-800",
    full_received: "bg-green-100 text-green-800",
    paid: "bg-green-100 text-green-800",
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="font-heading text-3xl">Bookings Management</h1>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search bookings..." 
              className="pl-9 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showManualBooking} onOpenChange={setShowManualBooking}>
            <DialogTrigger asChild>
              <Button className="btn-luxury" data-testid="manual-booking-btn">
                <Plus size={16} className="mr-2" />
                Manual Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Manual Booking</DialogTitle>
              </DialogHeader>
              <ManualBookingForm 
                villas={villas} 
                onSuccess={() => { setShowManualBooking(false); fetchBookings(); }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.booking_id} className="bg-card border border-border p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading text-lg">{booking.guest_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${statusColors[booking.booking_status]}`}>
                      {booking.booking_status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">{booking.villa_name}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {booking.check_in} to {booking.check_out}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {booking.num_guests} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {booking.guest_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {booking.guest_phone}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-heading text-xl">{formatPrice(booking.total_booking_amount || booking.total_amount)}</p>
                  <span className={`px-2 py-1 text-xs rounded ${paymentStatusColors[booking.payment_status] || 'bg-gray-100 text-gray-800'}`}>
                    {booking.payment_status === 'advance_received' ? 'Advance Received' : 
                     booking.payment_status === 'full_received' ? 'Paid in Full' : 
                     booking.payment_status || 'Pending Payment'}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(booking)} title="Edit booking">
                      <Edit size={14} />
                    </Button>
                    {/* Payment Actions */}
                    {booking.booking_status === 'pending' && !booking.full_payment_received && (
                      <>
                        {!booking.advance_received && (
                          <Button size="sm" variant="outline" onClick={() => openPaymentModal(booking, 'advance')}>
                            Mark Advance
                          </Button>
                        )}
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openPaymentModal(booking, 'full')}>
                          <Check size={14} className="mr-1" /> Full Payment
                        </Button>
                      </>
                    )}
                    {booking.booking_status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.booking_id, 'completed')}>
                        <CheckCircle size={14} className="mr-1" /> Complete
                      </Button>
                    )}
                    {booking.booking_status === 'pending' && (
                      <Button size="sm" variant="destructive" onClick={() => updateBookingStatus(booking.booking_id, 'cancelled')}>
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                  {/* Confirmation Actions */}
                  {booking.booking_status === 'confirmed' && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                      <Button size="sm" variant="ghost" onClick={() => downloadConfirmationPDF(booking.booking_id)} title="Download PDF">
                        <Download size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => getWhatsAppLink(booking.booking_id)} title="Send WhatsApp">
                        <MessageSquare size={14} className="text-green-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {/* Extra details for manual bookings */}
              {booking.is_manual_booking && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Manual Booking Details:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tariff/Night:</span>
                      <p className="font-medium">{formatPrice(booking.tariff_per_night)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Security Deposit:</span>
                      <p className="font-medium">{formatPrice(booking.security_deposit)}</p>
                    </div>
                    {booking.advance_amount > 0 && (
                      <div>
                        <span className="text-muted-foreground">Advance Paid:</span>
                        <p className="font-medium text-green-600">{formatPrice(booking.advance_amount)}</p>
                      </div>
                    )}
                    {booking.balance_amount > 0 && (
                      <div>
                        <span className="text-muted-foreground">Balance Due:</span>
                        <p className="font-medium text-orange-600">{formatPrice(booking.balance_amount)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-border">
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentModalData.paymentType === 'advance' ? 'Record Advance Payment' : 'Record Full Payment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Amount Received (₹)</label>
              <Input
                type="number"
                value={paymentModalData.amount}
                onChange={(e) => setPaymentModalData({ ...paymentModalData, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Mode</label>
              <Select 
                value={paymentModalData.paymentMode} 
                onValueChange={(v) => setPaymentModalData({ ...paymentModalData, paymentMode: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online Transfer (NEFT/IMPS)</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentModalData.paymentType === 'full' && (
              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                <p className="text-green-800">
                  Marking full payment will automatically confirm the booking and send a confirmation to the guest.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={markPaymentReceived} className="btn-luxury">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Guest Name</label>
                  <Input value={editFormData.guest_name} onChange={(e) => setEditFormData({ ...editFormData, guest_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Guest Phone</label>
                  <Input value={editFormData.guest_phone} onChange={(e) => setEditFormData({ ...editFormData, guest_phone: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Guest Email</label>
                <Input type="email" value={editFormData.guest_email} onChange={(e) => setEditFormData({ ...editFormData, guest_email: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Check-in</label>
                  <Input type="date" value={editFormData.check_in} onChange={(e) => setEditFormData({ ...editFormData, check_in: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Check-out</label>
                  <Input type="date" value={editFormData.check_out} onChange={(e) => setEditFormData({ ...editFormData, check_out: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Guests</label>
                  <Input type="number" min="1" value={editFormData.num_guests} onChange={(e) => setEditFormData({ ...editFormData, num_guests: parseInt(e.target.value) || 1 })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Amount (₹)</label>
                  <Input type="number" value={editFormData.total_booking_amount} onChange={(e) => setEditFormData({ ...editFormData, total_booking_amount: parseFloat(e.target.value) || 0 })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Security Deposit (₹)</label>
                  <Input type="number" value={editFormData.security_deposit} onChange={(e) => setEditFormData({ ...editFormData, security_deposit: parseFloat(e.target.value) || 0 })} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Owner Commission (%)</label>
                <p className="text-xs text-muted-foreground mb-1">Overrides this booking's commission - owner payout recalculates automatically. Leave empty to keep the villa's default.</p>
                <Input type="number" min="0" max="100" step="0.1" placeholder="Villa default" value={editFormData.commission_percent} onChange={(e) => setEditFormData({ ...editFormData, commission_percent: e.target.value })} className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveEditedBooking} className="btn-luxury">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Manual Booking Form Component
const ManualBookingForm = ({ villas, onSuccess }) => {
  const [formData, setFormData] = useState({
    villa_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    num_guests: 6,
    tariff_per_night: 0,
    total_nights: 1,
    total_booking_amount: 0,
    security_deposit: 20000,
    advance_amount: 0,
    balance_amount: 0,
    extra_pax_charge: 0,
    extra_pax_count: 0,
    special_requests: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedVilla = villas.find(v => v.villa_id === formData.villa_id);

  // Auto-calculate totals
  useEffect(() => {
    if (formData.check_in && formData.check_out) {
      const start = new Date(formData.check_in);
      const end = new Date(formData.check_out);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (nights > 0) {
        const baseAmount = formData.tariff_per_night * nights;
        const total = baseAmount + formData.extra_pax_charge;
        setFormData(prev => ({
          ...prev,
          total_nights: nights,
          total_booking_amount: total,
          balance_amount: total - prev.advance_amount
        }));
      }
    }
  }, [formData.check_in, formData.check_out, formData.tariff_per_night, formData.extra_pax_charge, formData.advance_amount]);

  // Set default tariff when villa is selected
  useEffect(() => {
    if (selectedVilla) {
      setFormData(prev => ({
        ...prev,
        tariff_per_night: selectedVilla.base_price,
        security_deposit: selectedVilla.security_deposit || 20000
      }));
    }
  }, [selectedVilla]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/admin/manual-booking`, formData, { headers: getAuthHeaders() });
      toast.success("Booking created successfully");
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create booking"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Villa Selection */}
      <div>
        <label className="text-sm font-medium">Select Villa *</label>
        <Select value={formData.villa_id} onValueChange={(v) => setFormData({ ...formData, villa_id: v })}>
          <SelectTrigger><SelectValue placeholder="Choose a villa" /></SelectTrigger>
          <SelectContent>
            {villas.map((villa) => (
              <SelectItem key={villa.villa_id} value={villa.villa_id}>
                {villa.name} - {villa.location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guest Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Guest Name *</label>
          <Input 
            value={formData.guest_name} 
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            required 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Guest Phone *</label>
          <Input 
            value={formData.guest_phone} 
            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
            placeholder="+91..."
            required 
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Guest Email *</label>
        <Input 
          type="email"
          value={formData.guest_email} 
          onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
          required 
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Check-in Date *</label>
          <Input 
            type="date"
            value={formData.check_in} 
            onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
            required 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Check-out Date *</label>
          <Input 
            type="date"
            value={formData.check_out} 
            onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
            required 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Number of Guests</label>
          <Input 
            type="number"
            value={formData.num_guests} 
            onChange={(e) => setFormData({ ...formData, num_guests: parseInt(e.target.value) })}
            min={1}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-muted/50 p-4 rounded space-y-4">
        <h4 className="font-medium">Pricing Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Tariff per Night (₹)</label>
            <Input 
              type="number"
              value={formData.tariff_per_night} 
              onChange={(e) => setFormData({ ...formData, tariff_per_night: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Total Nights</label>
            <Input 
              type="number"
              value={formData.total_nights} 
              readOnly
              className="bg-muted"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Extra Pax Charge (₹)</label>
            <Input 
              type="number"
              value={formData.extra_pax_charge} 
              onChange={(e) => setFormData({ ...formData, extra_pax_charge: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Total Booking Amount (₹)</label>
            <Input 
              type="number"
              value={formData.total_booking_amount} 
              onChange={(e) => setFormData({ ...formData, total_booking_amount: parseFloat(e.target.value) || 0 })}
              className="font-bold"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Security Deposit (₹)</label>
            <Input 
              type="number"
              value={formData.security_deposit} 
              onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Payment Tracking */}
      <div className="bg-accent/10 p-4 rounded space-y-4">
        <h4 className="font-medium">Payment Tracking</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Advance Amount (₹)</label>
            <Input 
              type="number"
              value={formData.advance_amount} 
              onChange={(e) => {
                const advance = parseFloat(e.target.value) || 0;
                setFormData({ 
                  ...formData, 
                  advance_amount: advance,
                  balance_amount: formData.total_booking_amount - advance
                });
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Balance Amount (₹)</label>
            <Input 
              type="number"
              value={formData.balance_amount} 
              readOnly
              className="bg-muted"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium">Special Requests / Notes</label>
        <Textarea 
          value={formData.special_requests} 
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          rows={3}
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" className="btn-luxury" disabled={submitting || !formData.villa_id}>
          {submitting ? "Creating..." : "Create Booking"}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Admin Leads with status management
const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API}/leads`, { headers: getAuthHeaders() });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await axios.put(`${API}/leads/${leadId}`, { status }, { headers: getAuthHeaders() });
      toast.success("Lead updated");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };

  const filteredLeads = leads.filter(l => typeFilter === "all" || l.lead_type === typeFilter);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="font-heading text-3xl">Leads & Callbacks</h1>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="callback">Callbacks</SelectItem>
            <SelectItem value="homeowner">Homeowners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted" />
          ))}
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <div key={lead.lead_id} className="bg-card border border-border p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-lg">{lead.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      lead.lead_type === 'homeowner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {lead.lead_type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      lead.status === 'new' ? 'bg-green-100 text-green-800' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status || 'new'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-accent">
                      <Phone size={14} />
                      {lead.phone}
                    </a>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-accent">
                        <Mail size={14} />
                        {lead.email}
                      </a>
                    )}
                  </div>
                  {lead.villa_name && (
                    <p className="text-sm">Interested in: <span className="font-medium">{lead.villa_name}</span></p>
                  )}
                  {lead.message && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{lead.message}"</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Select value={lead.status || 'new'} onValueChange={(v) => updateLeadStatus(lead.lead_id, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
      const response = await axios.get(`${API}/owners`, { headers: getAuthHeaders() });
      setOwners(response.data.owners || []);
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
                <th className="text-left p-4 text-sm font-medium">Villas</th>
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
                  <td className="p-4 text-muted-foreground">{owner.villa_count || 0}</td>
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

// Admin Team - invite other admins by email
const AdminTeam = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [inviteLink, setInviteLink] = useState(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`${API}/admin/team`, { headers: getAuthHeaders() });
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteLink(null);
    try {
      const response = await axios.post(
        `${API}/admin/invite-admin`,
        { name: form.name, email: form.email },
        { headers: getAuthHeaders() }
      );
      const link = `${window.location.origin}/accept-invite/${response.data.invite_token}`;
      setInviteLink(link);
      toast.success("Invite created - share the link below");
      setForm({ name: "", email: "" });
      fetchTeam();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create invite"));
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Copied to clipboard");
  };

  const handleRemove = async (a) => {
    if (!window.confirm(`Remove ${a.name} (${a.email}) from the admin team?`)) return;
    try {
      await axios.delete(`${API}/admin/team/${a.user_id}`, { headers: getAuthHeaders() });
      toast.success("Removed");
      fetchTeam();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove admin"));
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Team</h1>

      <div className="bg-card border border-border p-6 mb-8 max-w-xl">
        <h2 className="font-medium mb-4">Invite a new admin</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Button type="submit" className="btn-luxury" disabled={inviting}>
            {inviting ? "Creating invite..." : "Send Invite"}
          </Button>
        </form>

        {inviteLink && (
          <div className="mt-4 p-4 bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Share this link with them (it's not emailed automatically unless email sending is configured):
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="text-xs" />
              <Button type="button" variant="outline" onClick={copyLink}>
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>

      <h2 className="font-medium mb-4">Current admins</h2>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-muted" />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Name</th>
                <th className="text-left p-4 text-sm font-medium">Email</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
                <th className="text-left p-4 text-sm font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.user_id} className="border-t border-border">
                  <td className="p-4 font-medium">{a.name}</td>
                  <td className="p-4 text-muted-foreground">{a.email}</td>
                  <td className="p-4">
                    {a.invite_pending ? (
                      <span className="text-xs uppercase tracking-wider text-accent">Invite Pending</span>
                    ) : (
                      <span className="text-xs uppercase tracking-wider text-green-600">Active</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {a.user_id !== currentUser?.user_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(a)}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      const response = await axios.get(`${API}/financials/summary`, { headers: getAuthHeaders() });
      setFinancials(response.data);
    } catch (error) {
      console.error("Error fetching financials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/financials/export`, { 
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financials_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl">Financial Summary</h1>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </div>

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
            <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
            <p className="font-heading text-3xl">{formatPrice(financials?.total_revenue)}</p>
          </div>
          <div className="bg-card p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Total Commission</p>
            <p className="font-heading text-3xl text-green-600">{formatPrice(financials?.total_commission)}</p>
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
      )}
    </div>
  );
};

// Admin Private Offers
const EMPTY_OFFER_FORM = {
  villa_id: "",
  custom_villa_name: "",
  custom_villa_location: "",
  custom_bedrooms: "",
  custom_bathrooms: "",
  custom_map_link: "",
  amenities: [],
  guest_name: "",
  guest_email: "",
  guest_phone: "",
  check_in: "",
  check_out: "",
  num_guests: 2,
  custom_per_night: 0,
  discount_percent: 0,
  security_deposit: null,
  notes: "",
  expiry_hours: 48
};

const AdminPrivateOffers = () => {
  const [offers, setOffers] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [useCustomVilla, setUseCustomVilla] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_OFFER_FORM);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [offersRes, villasRes] = await Promise.all([
        axios.get(`${API}/admin/private-offers`, { headers: getAuthHeaders() }),
        axios.get(`${API}/villas`, { headers: getAuthHeaders() })
      ]);
      setOffers(offersRes.data.offers || []);
      setVillas(villasRes.data.villas || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingOfferId(null);
    setUseCustomVilla(false);
    setFormData(EMPTY_OFFER_FORM);
    setShowCreate(true);
  };

  const openEditDialog = (offer) => {
    setEditingOfferId(offer.offer_id);
    setUseCustomVilla(!offer.villa_id);
    setFormData({
      villa_id: offer.villa_id || "",
      custom_villa_name: offer.villa_id ? "" : (offer.villa_name || ""),
      custom_villa_location: offer.villa_id ? "" : (offer.villa_location || ""),
      custom_bedrooms: offer.villa_id ? "" : (offer.bedrooms || ""),
      custom_bathrooms: offer.villa_id ? "" : (offer.bathrooms || ""),
      custom_map_link: offer.villa_id ? "" : (offer.map_link || ""),
      amenities: offer.amenities || [],
      guest_name: offer.guest_name || "",
      guest_email: offer.guest_email || "",
      guest_phone: offer.guest_phone || "",
      check_in: offer.check_in || "",
      check_out: offer.check_out || "",
      num_guests: offer.num_guests || 2,
      custom_per_night: offer.num_nights ? Math.round(offer.base_amount / offer.num_nights) : 0,
      discount_percent: offer.discount_percent || 0,
      security_deposit: offer.security_deposit ?? null,
      notes: offer.notes || "",
      expiry_hours: 48
    });
    setShowCreate(true);
  };

  const handleVillaSelect = (villaId) => {
    const villa = villas.find(v => v.villa_id === villaId);
    setFormData({
      ...formData,
      villa_id: villaId,
      // Pre-set villas auto-select their own amenities - admin can still adjust
      amenities: villa?.amenities || [],
    });
  };

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmitOffer = async () => {
    const villaOk = useCustomVilla ? formData.custom_villa_name : formData.villa_id;
    if (!villaOk || !formData.guest_name || !formData.check_in || !formData.check_out) {
      toast.error("Please fill required fields");
      return;
    }
    const payload = {
      ...formData,
      villa_id: useCustomVilla ? null : formData.villa_id,
      custom_bedrooms: formData.custom_bedrooms ? parseInt(formData.custom_bedrooms) : null,
      custom_bathrooms: formData.custom_bathrooms ? parseInt(formData.custom_bathrooms) : null,
    };
    try {
      if (editingOfferId) {
        await axios.put(`${API}/admin/private-offers/${editingOfferId}`, payload, { headers: getAuthHeaders() });
        toast.success("Private offer updated!");
      } else {
        const response = await axios.post(`${API}/admin/private-offers`, payload, { headers: getAuthHeaders() });
        toast.success("Private offer created!");
        if (response.data.payment_link) {
          navigator.clipboard.writeText(response.data.payment_link);
          toast.success("Payment link copied to clipboard!");
        }
      }
      setShowCreate(false);
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save offer"));
    }
  };

  const handleDeleteOffer = async (offer) => {
    if (!window.confirm(`Delete the private offer for ${offer.guest_name}? This can't be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/private-offers/${offer.offer_id}`, { headers: getAuthHeaders() });
      toast.success("Offer deleted");
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete offer"));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      expired: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div data-testid="admin-private-offers">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl">Private Offers</h1>
          <p className="text-muted-foreground mt-1">Create negotiated pricing with time-limited payment links</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setEditingOfferId(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus size={16} />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOfferId ? "Edit Private Offer" : "Create Private Offer"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 flex items-center gap-2 -mb-2">
                <Checkbox
                  id="use-custom-villa"
                  checked={useCustomVilla}
                  onCheckedChange={(checked) => {
                    setUseCustomVilla(!!checked);
                    setFormData({ ...formData, villa_id: "", amenities: checked ? [] : formData.amenities });
                  }}
                />
                <label htmlFor="use-custom-villa" className="text-sm">
                  Villa not listed on the website (other property the company represents)
                </label>
              </div>

              {useCustomVilla ? (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Villa Name *</label>
                    <Input value={formData.custom_villa_name} onChange={(e) => setFormData({...formData, custom_villa_name: e.target.value})} placeholder="e.g. Casa Del Sol" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <Input value={formData.custom_villa_location} onChange={(e) => setFormData({...formData, custom_villa_location: e.target.value})} placeholder="e.g. Candolim, Goa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Google Maps Link</label>
                    <Input value={formData.custom_map_link} onChange={(e) => setFormData({...formData, custom_map_link: e.target.value})} placeholder="Paste a full Google Maps URL" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bedrooms</label>
                    <Input type="number" min="1" value={formData.custom_bedrooms} onChange={(e) => setFormData({...formData, custom_bedrooms: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bathrooms</label>
                    <Input type="number" min="1" value={formData.custom_bathrooms} onChange={(e) => setFormData({...formData, custom_bathrooms: e.target.value})} />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Villa *</label>
                  <Select value={formData.villa_id} onValueChange={handleVillaSelect}>
                    <SelectTrigger><SelectValue placeholder="Select villa" /></SelectTrigger>
                    <SelectContent>
                      {villas.map(v => (
                        <SelectItem key={v.villa_id} value={v.villa_id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Amenities {!useCustomVilla && formData.villa_id && <span className="text-xs text-muted-foreground font-normal">(auto-selected from villa - adjust if needed)</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(AMENITY_GROUPS).flat().map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1 text-sm border transition-colors ${
                        formData.amenities.includes(amenity)
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border hover:border-accent"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Guest Name *</label>
                <Input value={formData.guest_name} onChange={(e) => setFormData({...formData, guest_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guest Email *</label>
                <Input type="email" value={formData.guest_email} onChange={(e) => setFormData({...formData, guest_email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guest Phone *</label>
                <Input value={formData.guest_phone} onChange={(e) => setFormData({...formData, guest_phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Guests</label>
                <Input type="number" min="1" value={formData.num_guests} onChange={(e) => setFormData({...formData, num_guests: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-in *</label>
                <Input type="date" value={formData.check_in} onChange={(e) => setFormData({...formData, check_in: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-out *</label>
                <Input type="date" value={formData.check_out} onChange={(e) => setFormData({...formData, check_out: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Custom Per Night Rate (₹) *</label>
                <Input type="number" min="0" value={formData.custom_per_night} onChange={(e) => setFormData({...formData, custom_per_night: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount (%)</label>
                <Input type="number" min="0" max="100" value={formData.discount_percent} onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Security Deposit Override (₹)</label>
                <Input type="number" min="0" placeholder="Leave empty for default" value={formData.security_deposit || ""} onChange={(e) => setFormData({...formData, security_deposit: e.target.value ? parseFloat(e.target.value) : null})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Offer Expires In (hours)</label>
                <Input type="number" min="1" value={formData.expiry_hours} onChange={(e) => setFormData({...formData, expiry_hours: parseInt(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Internal notes about this offer..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSubmitOffer}>{editingOfferId ? "Save Changes" : "Create & Get Link"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted w-1/4 mb-4" />
              <div className="h-6 bg-muted w-1/2" />
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No private offers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first negotiated offer above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div key={offer.offer_id} className="bg-card border border-border p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{offer.villa_name}</h3>
                    {!offer.villa_id && (
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">off-catalog</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(offer.status)}`}>
                      {offer.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{offer.guest_name} • {offer.guest_email}</p>
                  <p className="text-sm text-muted-foreground">{offer.check_in} → {offer.check_out} • {offer.num_nights} nights</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl">{formatPrice(offer.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">Expires: {new Date(offer.expires_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(`${BACKEND_URL}/api/offer/${offer.offer_id}/pdf`, "_blank")}>
                  View PDF
                </Button>
                {offer.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(offer)}>
                    Edit
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteOffer(offer)}>
                  Delete
                </Button>
                {offer.payment_link && offer.status === "pending" && (
                  <>
                    <Input value={offer.payment_link} readOnly className="text-sm flex-1 min-w-[180px]" />
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(offer.payment_link);
                      toast.success("Copied!");
                    }}>Copy</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Payouts
const AdminPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchPayouts();
  }, [filter]);

  const fetchPayouts = async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const response = await axios.get(`${API}/admin/payouts${params}`, { headers: getAuthHeaders() });
      setPayouts(response.data.payouts || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayouts = async () => {
    try {
      const response = await axios.post(`${API}/admin/payouts/generate`, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
      fetchPayouts();
    } catch (error) {
      toast.error("Failed to generate payouts");
    }
  };

  const handleMarkPaid = async (payoutId, paymentRef, paymentMode) => {
    try {
      await axios.put(`${API}/admin/payouts/${payoutId}`, {
        status: "paid",
        payment_reference: paymentRef,
        payment_mode: paymentMode
      }, { headers: getAuthHeaders() });
      toast.success("Payout marked as paid");
      fetchPayouts();
    } catch (error) {
      toast.error("Failed to update payout");
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/admin/payouts/export`, { headers: getAuthHeaders() });
      const blob = new Blob([response.data.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payouts_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  return (
    <div data-testid="admin-payouts">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl">Owner Payouts</h1>
          <p className="text-muted-foreground mt-1">Track and manage payouts to villa owners</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGeneratePayouts} className="gap-2">
            <RefreshCw size={16} />
            Generate Payouts
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border p-6">
            <p className="text-sm text-muted-foreground mb-1">Pending Payouts</p>
            <p className="font-heading text-3xl text-yellow-600">{formatPrice(summary.total_pending)}</p>
          </div>
          <div className="bg-card border border-border p-6">
            <p className="text-sm text-muted-foreground mb-1">Paid Out</p>
            <p className="font-heading text-3xl text-green-600">{formatPrice(summary.total_paid)}</p>
          </div>
          <div className="bg-card border border-border p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Records</p>
            <p className="font-heading text-3xl">{summary.count}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "pending", "paid"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted w-1/4 mb-4" />
              <div className="h-6 bg-muted w-1/2" />
            </div>
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No payouts found</p>
          <p className="text-sm text-muted-foreground mt-1">Generate payouts from confirmed bookings above</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Villa</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Booking</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Gross</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Commission</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net Payable</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.payout_id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-sm">{payout.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{payout.owner_email}</p>
                  </td>
                  <td className="py-3 px-4 text-sm">{payout.villa_name}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm">{payout.booking_check_in}</p>
                    <p className="text-xs text-muted-foreground">→ {payout.booking_check_out}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">{formatPrice(payout.gross_amount)}</td>
                  <td className="py-3 px-4 text-sm text-right text-red-600">-{formatPrice(payout.commission_amount)}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium">{formatPrice(payout.net_payable)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      payout.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {payout.status === "pending" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">Mark Paid</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mark Payout as Paid</DialogTitle>
                          </DialogHeader>
                          <MarkPaidForm payoutId={payout.payout_id} onSuccess={() => fetchPayouts()} />
                        </DialogContent>
                      </Dialog>
                    )}
                    {payout.status === "paid" && payout.payment_reference && (
                      <span className="text-xs text-muted-foreground">{payout.payment_reference}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Helper component for marking payouts as paid
const MarkPaidForm = ({ payoutId, onSuccess }) => {
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/payouts/${payoutId}`, {
        status: "paid",
        payment_reference: paymentRef,
        payment_mode: paymentMode
      }, { headers: getAuthHeaders() });
      toast.success("Payout marked as paid");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update payout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="block text-sm font-medium mb-1">Payment Mode</label>
        <Select value={paymentMode} onValueChange={setPaymentMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Payment Reference</label>
        <Input
          placeholder="Transaction ID / Reference"
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Confirm Payment"}
        </Button>
      </DialogFooter>
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
      const response = await axios.get(`${API}/homeowner-listings`, { headers: getAuthHeaders() });
      setListings(response.data.listings || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateListingStatus = async (listingId, status) => {
    try {
      await axios.put(`${API}/homeowner-listings/${listingId}`, { status }, { headers: getAuthHeaders() });
      toast.success(`Listing ${status}`);
      fetchListings();
    } catch (error) {
      toast.error("Failed to update listing");
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-heading text-xl">{listing.villa_name}</h3>
                  <p className="text-muted-foreground">{listing.villa_location}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                  listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {listing.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
              {listing.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateListingStatus(listing.listing_id, 'approved')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateListingStatus(listing.listing_id, 'rejected')}>
                    Reject
                  </Button>
                </div>
              )}
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

// Admin Blog Management
const AdminBlog = () => {
  const [posts, setPosts] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category: "Travel Guide",
    tags: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    author: "Team Travaholic",
    published_date: new Date().toISOString().split('T')[0],
    read_time: "5 min read",
    status: "draft",
    is_featured: false,
    related_villa_ids: []
  });

  const categories = ["Travel Guide", "Destinations", "Travel Tips", "Villa Guide", "Food & Dining", "Local Experiences"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [postsRes, villasRes] = await Promise.all([
        axios.get(`${API}/admin/blog/posts`, { headers: getAuthHeaders() }),
        axios.get(`${API}/villas`, { headers: getAuthHeaders() })
      ]);
      setPosts(postsRes.data.posts || []);
      setVillas(villasRes.data.villas || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error("Please fill required fields (title, slug, content)");
      return;
    }
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        meta_keywords: formData.meta_keywords.split(',').map(t => t.trim()).filter(t => t)
      };
      await axios.post(`${API}/admin/blog/posts`, payload, { headers: getAuthHeaders() });
      toast.success("Blog post created!");
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create post"));
    }
  };

  const handleUpdate = async () => {
    if (!editingPost) return;
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        meta_keywords: formData.meta_keywords.split(',').map(t => t.trim()).filter(t => t)
      };
      await axios.put(`${API}/admin/blog/posts/${editingPost.post_id}`, payload, { headers: getAuthHeaders() });
      toast.success("Blog post updated!");
      setEditingPost(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update post"));
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm("Delete this blog post?")) return;
    try {
      await axios.delete(`${API}/admin/blog/posts/${postId}`, { headers: getAuthHeaders() });
      toast.success("Post deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const handlePublish = async (postId) => {
    try {
      await axios.post(`${API}/admin/blog/posts/${postId}/publish`, {}, { headers: getAuthHeaders() });
      toast.success("Post published!");
      fetchData();
    } catch (error) {
      toast.error("Failed to publish post");
    }
  };

  const handleUnpublish = async (postId) => {
    try {
      await axios.post(`${API}/admin/blog/posts/${postId}/unpublish`, {}, { headers: getAuthHeaders() });
      toast.success("Post unpublished");
      fetchData();
    } catch (error) {
      toast.error("Failed to unpublish post");
    }
  };

  const startEdit = (post) => {
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: post.featured_image,
      category: post.category,
      tags: post.tags?.join(', ') || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      meta_keywords: post.meta_keywords?.join(', ') || '',
      author: post.author,
      published_date: post.published_date,
      read_time: post.read_time,
      status: post.status,
      is_featured: post.is_featured,
      related_villa_ids: post.related_villa_ids || []
    });
    setEditingPost(post);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featured_image: "",
      category: "Travel Guide",
      tags: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      author: "Team Travaholic",
      published_date: new Date().toISOString().split('T')[0],
      read_time: "5 min read",
      status: "draft",
      is_featured: false,
      related_villa_ids: []
    });
  };

  const filteredPosts = posts.filter(p => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const BlogForm = ({ isEdit = false }) => (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Title *</label>
          <Input
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Best Beaches in North Goa"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL Slug *</label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({...formData, slug: e.target.value})}
            placeholder="best-beaches-north-goa"
          />
          <p className="text-xs text-muted-foreground mt-1">/blog/{formData.slug || 'your-slug'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Excerpt (Short description) *</label>
        <Textarea
          value={formData.excerpt}
          onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
          placeholder="Brief summary for blog cards and SEO..."
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content (supports **bold** and bullet points) *</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          placeholder="Write your full blog post content here..."
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Featured Image URL</label>
        <Input
          value={formData.featured_image}
          onChange={(e) => setFormData({...formData, featured_image: e.target.value})}
          placeholder="https://images.unsplash.com/..."
        />
        {formData.featured_image && (
          <img src={formData.featured_image} alt="Preview" className="mt-2 h-32 object-cover rounded" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            placeholder="goa, beaches, travel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Read Time</label>
          <Input
            value={formData.read_time}
            onChange={(e) => setFormData({...formData, read_time: e.target.value})}
            placeholder="5 min read"
          />
        </div>
      </div>

      {/* SEO Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Tag size={16} />
          SEO Settings
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Meta Title</label>
            <Input
              value={formData.meta_title}
              onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
              placeholder={formData.title || "Defaults to post title"}
            />
            <p className="text-xs text-muted-foreground mt-1">{(formData.meta_title || formData.title || '').length}/60 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta Description</label>
            <Textarea
              value={formData.meta_description}
              onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
              placeholder={formData.excerpt || "Defaults to excerpt"}
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">{(formData.meta_description || formData.excerpt || '').length}/160 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta Keywords (comma separated)</label>
            <Input
              value={formData.meta_keywords}
              onChange={(e) => setFormData({...formData, meta_keywords: e.target.value})}
              placeholder="luxury villa goa, north goa beaches, vacation rentals"
            />
          </div>
        </div>
      </div>

      {/* Related Villas */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium mb-3">Link to Villas (for internal linking)</h3>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {villas.map(v => (
            <label key={v.villa_id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.related_villa_ids.includes(v.villa_id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({...formData, related_villa_ids: [...formData.related_villa_ids, v.villa_id]});
                  } else {
                    setFormData({...formData, related_villa_ids: formData.related_villa_ids.filter(id => id !== v.villa_id)});
                  }
                }}
                className="rounded"
              />
              {v.name}
            </label>
          ))}
        </div>
      </div>

      {/* Publishing Options */}
      <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-4">
        <div>
          <label className="block text-sm font-medium mb-1">Author</label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({...formData, author: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Publish Date</label>
          <Input
            type="date"
            value={formData.published_date}
            onChange={(e) => setFormData({...formData, published_date: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.is_featured}
          onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
          className="rounded"
        />
        Featured post (show prominently on blog page)
      </label>
    </div>
  );

  return (
    <div data-testid="admin-blog">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl">Blog Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage SEO-optimized blog posts</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Blog Post</DialogTitle>
            </DialogHeader>
            <BlogForm />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate}>Create Post</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Posts</p>
          <p className="font-heading text-2xl">{posts.length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Published</p>
          <p className="font-heading text-2xl text-green-600">{posts.filter(p => p.status === 'published').length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Drafts</p>
          <p className="font-heading text-2xl text-yellow-600">{posts.filter(p => p.status === 'draft').length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Featured</p>
          <p className="font-heading text-2xl text-accent">{posts.filter(p => p.is_featured).length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "published", "draft", "archived"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted w-1/4 mb-4" />
              <div className="h-6 bg-muted w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No blog posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first post to improve SEO</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.post_id} className="bg-card border border-border p-6">
              <div className="flex gap-6">
                {post.featured_image && (
                  <img src={post.featured_image} alt="" className="w-32 h-24 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{post.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      post.status === 'published' ? 'bg-green-100 text-green-800' :
                      post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {post.status}
                    </span>
                    {post.is_featured && (
                      <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">Featured</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{post.category}</span>
                    <span>{post.published_date}</span>
                    <span>{post.read_time}</span>
                    <span className="text-accent">/blog/{post.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.status === 'draft' ? (
                    <Button size="sm" onClick={() => handlePublish(post.post_id)}>Publish</Button>
                  ) : post.status === 'published' ? (
                    <Button size="sm" variant="outline" onClick={() => handleUnpublish(post.post_id)}>Unpublish</Button>
                  ) : null}
                  <Dialog open={editingPost?.post_id === post.post_id} onOpenChange={(open) => !open && setEditingPost(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => startEdit(post)}>
                        <Edit size={14} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Edit Blog Post</DialogTitle>
                      </DialogHeader>
                      <BlogForm isEdit />
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(post.post_id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SEO Tips */}
      <div className="mt-8 bg-accent/10 border border-accent/30 p-6">
        <h3 className="font-medium mb-3">SEO Best Practices</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Keep meta titles under 60 characters and meta descriptions under 160</li>
          <li>• Use relevant keywords naturally in your content</li>
          <li>• Link to villa pages from blog posts to improve internal linking</li>
          <li>• Include location-based keywords (e.g., "luxury villa Goa", "Anjuna beach stay")</li>
          <li>• Publish consistently - aim for 2-4 posts per month</li>
        </ul>
      </div>
    </div>
  );
};

// Admin Event Pricing
const AdminEventPricing = () => {
  const [events, setEvents] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    villa_id: "",
    start_date: "",
    end_date: "",
    price_multiplier: 1.5,
    min_nights: 3
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, villasRes] = await Promise.all([
        axios.get(`${API}/admin/event-pricing`, { headers: getAuthHeaders() }),
        axios.get(`${API}/villas`, { headers: getAuthHeaders() })
      ]);
      setEvents(eventsRes.data.events || []);
      setVillas(villasRes.data.villas || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await axios.post(`${API}/admin/event-pricing`, {
        ...formData,
        villa_id: formData.villa_id || null
      }, { headers: getAuthHeaders() });
      toast.success("Event pricing created");
      setShowCreate(false);
      setFormData({
        name: "",
        villa_id: "",
        start_date: "",
        end_date: "",
        price_multiplier: 1.5,
        min_nights: 3
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to create event pricing");
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm("Delete this event pricing rule?")) return;
    try {
      await axios.delete(`${API}/admin/event-pricing/${eventId}`, { headers: getAuthHeaders() });
      toast.success("Event pricing deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div data-testid="admin-event-pricing">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl">Event Pricing</h1>
          <p className="text-muted-foreground mt-1">Set special pricing for holidays and peak seasons</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event Pricing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Name *</label>
                <Input
                  placeholder="e.g., New Year's Eve 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apply to Villa (leave empty for all)</label>
                <Select value={formData.villa_id} onValueChange={(v) => setFormData({...formData, villa_id: v})}>
                  <SelectTrigger><SelectValue placeholder="All villas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Villas</SelectItem>
                    {villas.map(v => (
                      <SelectItem key={v.villa_id} value={v.villa_id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.price_multiplier}
                    onChange={(e) => setFormData({...formData, price_multiplier: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">1.5 = 50% increase</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Nights</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.min_nights}
                    onChange={(e) => setFormData({...formData, min_nights: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Events</p>
          <p className="font-heading text-2xl">{events.filter(e => e.is_active).length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Global Events</p>
          <p className="font-heading text-2xl">{events.filter(e => !e.villa_id).length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground mb-1">Villa-Specific</p>
          <p className="font-heading text-2xl">{events.filter(e => e.villa_id).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted w-1/4 mb-4" />
              <div className="h-6 bg-muted w-1/2" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No event pricing rules</p>
          <p className="text-sm text-muted-foreground mt-1">Add pricing for holidays and peak seasons</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.event_id} className="bg-card border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{event.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    event.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {event.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.start_date} → {event.end_date}
                </p>
                <p className="text-sm text-muted-foreground">
                  Applies to: {event.villa_id ? villas.find(v => v.villa_id === event.villa_id)?.name || "Specific villa" : "All villas"}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-heading text-accent">{event.price_multiplier}x</p>
                  <p className="text-xs text-muted-foreground">Price</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-heading">{event.min_nights}</p>
                  <p className="text-xs text-muted-foreground">Min nights</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDelete(event.event_id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Common Events */}
      <div className="mt-8 bg-muted/50 border border-border p-6">
        <h3 className="font-medium mb-4">Quick Add Common Events</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "New Year's Eve 2025", start: "2025-12-28", end: "2026-01-02", multiplier: 2.0, nights: 4 },
            { name: "Christmas 2025", start: "2025-12-22", end: "2025-12-27", multiplier: 1.8, nights: 3 },
            { name: "Diwali 2025", start: "2025-10-18", end: "2025-10-25", multiplier: 1.6, nights: 2 },
            { name: "Holi 2025", start: "2025-03-12", end: "2025-03-16", multiplier: 1.4, nights: 2 },
            { name: "Sunburn Festival", start: "2025-12-28", end: "2025-12-31", multiplier: 1.8, nights: 3 },
          ].map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => setFormData({
                name: preset.name,
                villa_id: "",
                start_date: preset.start,
                end_date: preset.end,
                price_multiplier: preset.multiplier,
                min_nights: preset.nights
              }) || setShowCreate(true)}
            >
              + {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Admin Coupons Management
const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    min_booking_value: 0,
    max_discount: null,
    valid_from: "",
    valid_to: "",
    usage_limit: null,
    per_user_limit: 1,
    applicable_villas: [],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [couponsRes, villasRes] = await Promise.all([
        axios.get(`${API}/admin/coupons`, { headers: getAuthHeaders() }),
        axios.get(`${API}/villas`, { headers: getAuthHeaders() })
      ]);
      setCoupons(couponsRes.data.coupons || []);
      setVillas(villasRes.data.villas || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 10,
      min_booking_value: 0,
      max_discount: null,
      valid_from: "",
      valid_to: "",
      usage_limit: null,
      per_user_limit: 1,
      applicable_villas: [],
      is_active: true
    });
    setEditingCoupon(null);
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await axios.post(`${API}/admin/coupons`, formData, { headers: getAuthHeaders() });
      toast.success("Coupon created successfully");
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create coupon"));
    }
  };

  const handleUpdate = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await axios.put(`${API}/admin/coupons/${editingCoupon.coupon_id}`, formData, { headers: getAuthHeaders() });
      toast.success("Coupon updated successfully");
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update coupon"));
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await axios.delete(`${API}/admin/coupons/${couponId}`, { headers: getAuthHeaders() });
      toast.success("Coupon deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_booking_value: coupon.min_booking_value || 0,
      max_discount: coupon.max_discount || null,
      valid_from: coupon.valid_from ? coupon.valid_from.split("T")[0] : "",
      valid_to: coupon.valid_to ? coupon.valid_to.split("T")[0] : "",
      usage_limit: coupon.usage_limit || null,
      per_user_limit: coupon.per_user_limit || 1,
      applicable_villas: coupon.applicable_villas || [],
      is_active: coupon.is_active
    });
    setShowCreate(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-coupons">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading">Coupon Management</h1>
          <p className="text-muted-foreground">Create and manage discount codes</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-luxury" data-testid="create-coupon-btn">
              <Plus size={16} className="mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Coupon Code *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WELCOME10"
                  className="uppercase"
                  data-testid="coupon-code-input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., 10% off for new customers"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Discount Type *</label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v })}>
                  <SelectTrigger data-testid="discount-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Discount Value * {formData.discount_type === "percentage" ? "(%)" : "(₹)"}
                </label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  data-testid="discount-value-input"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Minimum Booking Value (₹)</label>
                <Input
                  type="number"
                  value={formData.min_booking_value}
                  onChange={(e) => setFormData({ ...formData, min_booking_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Max Discount Cap (₹)</label>
                <Input
                  type="number"
                  value={formData.max_discount || ""}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Valid From</label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Valid To</label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Usage Limit (Total)</label>
                <Input
                  type="number"
                  value={formData.usage_limit || ""}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Per User Limit</label>
                <Input
                  type="number"
                  value={formData.per_user_limit}
                  onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-2 block">Applicable Villas</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border p-2 rounded">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.applicable_villas.length === 0}
                      onChange={() => setFormData({ ...formData, applicable_villas: [] })}
                      className="rounded"
                    />
                    All Villas
                  </label>
                  {villas.map((villa) => (
                    <label key={villa.villa_id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.applicable_villas.includes(villa.villa_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, applicable_villas: [...formData.applicable_villas, villa.villa_id] });
                          } else {
                            setFormData({ ...formData, applicable_villas: formData.applicable_villas.filter(v => v !== villa.villa_id) });
                          }
                        }}
                        className="rounded"
                      />
                      {villa.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={editingCoupon ? handleUpdate : handleCreate} data-testid="save-coupon-btn">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-heading">{coupons.length}</p>
          <p className="text-sm text-muted-foreground">Total Coupons</p>
        </div>
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-heading text-green-600">{coupons.filter(c => c.is_active).length}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-heading">{coupons.reduce((sum, c) => sum + (c.used_count || 0), 0)}</p>
          <p className="text-sm text-muted-foreground">Total Uses</p>
        </div>
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-heading text-accent">{coupons.filter(c => c.discount_type === "percentage").length}</p>
          <p className="text-sm text-muted-foreground">% Discounts</p>
        </div>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border">
          <Ticket size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No coupons created yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first discount coupon to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <div
              key={coupon.coupon_id}
              className="bg-card border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              data-testid={`coupon-card-${coupon.code}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-lg font-bold bg-muted px-3 py-1 rounded">{coupon.code}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    coupon.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {coupon.description && (
                  <p className="text-sm text-muted-foreground mb-1">{coupon.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {coupon.valid_from && coupon.valid_to && (
                    <span>Valid: {coupon.valid_from.split("T")[0]} → {coupon.valid_to.split("T")[0]}</span>
                  )}
                  {coupon.usage_limit && (
                    <span>Uses: {coupon.used_count || 0} / {coupon.usage_limit}</span>
                  )}
                  {coupon.min_booking_value > 0 && (
                    <span>Min: ₹{coupon.min_booking_value.toLocaleString()}</span>
                  )}
                  {coupon.applicable_villas?.length > 0 && (
                    <span>For: {coupon.applicable_villas.length} villa(s)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-heading text-accent">
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {coupon.discount_type === "percentage" ? "Off" : "Flat Off"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(coupon)} data-testid={`edit-coupon-${coupon.code}`}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(coupon.coupon_id)} data-testid={`delete-coupon-${coupon.code}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Create Common Coupons */}
      <div className="bg-muted/50 border border-border p-6">
        <h3 className="font-medium mb-4">Quick Create Common Coupons</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { code: "WELCOME10", desc: "10% off for new customers", type: "percentage", value: 10 },
            { code: "SUMMER20", desc: "20% off summer special", type: "percentage", value: 20 },
            { code: "FLAT5000", desc: "₹5,000 off on bookings", type: "fixed", value: 5000 },
            { code: "LONGSTAY15", desc: "15% off for 7+ night stays", type: "percentage", value: 15 },
          ].map((preset) => (
            <Button
              key={preset.code}
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({
                  ...formData,
                  code: preset.code,
                  description: preset.desc,
                  discount_type: preset.type,
                  discount_value: preset.value,
                });
                setShowCreate(true);
              }}
            >
              + {preset.code}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Razorpay Setup Guide
const RazorpaySetup = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    razorpay_key_id: "",
    razorpay_key_secret: "",
    razorpay_webhook_secret: "",
    is_live_mode: false,
    partial_payment_enabled: true,
    min_advance_percent: 30
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/payment-settings`, { headers: getAuthHeaders() });
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/payment-settings`, formData, { headers: getAuthHeaders() });
      toast.success("Payment settings saved successfully");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const setupSteps = [
    {
      step: 1,
      title: "Create Razorpay Account",
      description: "Visit https://dashboard.razorpay.com/signup and create a business account. Complete KYC verification to access all features.",
      link: "https://dashboard.razorpay.com/signup"
    },
    {
      step: 2,
      title: "Generate API Keys",
      description: "Go to Settings → API Keys → Generate Key to create your Key ID and Key Secret. Store the Key Secret safely - it won't be shown again!",
      link: "https://dashboard.razorpay.com/app/website-app-settings/api-keys"
    },
    {
      step: 3,
      title: "Configure Keys Below",
      description: "Enter your Key ID and Key Secret in the form below. Start with TEST mode keys for development."
    },
    {
      step: 4,
      title: "Setup Webhook",
      description: `Configure webhook in Razorpay Dashboard → Settings → Webhooks:\n\nWebhook URL: ${window.location.origin}/api/webhooks/razorpay\n\nEvents to enable:\n• payment.authorized\n• payment.captured\n• payment.failed\n• refund.processed`,
      link: "https://dashboard.razorpay.com/app/webhooks"
    },
    {
      step: 5,
      title: "Test the Integration",
      description: "Create a test booking and complete payment using test card: 4111 1111 1111 1111, any future expiry, any CVV."
    },
    {
      step: 6,
      title: "Go Live",
      description: "Once testing is complete, generate LIVE API keys and update them here. Toggle 'Live Mode' to start accepting real payments."
    }
  ];

  return (
    <div data-testid="razorpay-setup">
      <h1 className="font-heading text-3xl mb-2">Razorpay Setup</h1>
      <p className="text-muted-foreground mb-8">Configure payment gateway for booking payments</p>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Status & Settings Form */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-card border border-border p-6">
              <h2 className="font-heading text-xl mb-4 flex items-center gap-2">
                Current Status
                {settings?.razorpay_key_id ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API Keys</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    settings?.razorpay_key_id ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {settings?.razorpay_key_id ? "Configured" : "Not Set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Webhook Secret</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    settings?.razorpay_webhook_secret_set ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {settings?.razorpay_webhook_secret_set ? "Configured" : "Not Set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    settings?.is_live_mode ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {settings?.is_live_mode ? "LIVE" : "TEST"}
                  </span>
                </div>
                {settings?.razorpay_key_id && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Key ID: {settings.razorpay_key_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Form */}
            <div className="bg-card border border-border p-6">
              <h2 className="font-heading text-xl mb-4">API Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Razorpay Key ID</label>
                  <Input
                    placeholder="rzp_test_..."
                    value={formData.razorpay_key_id}
                    onChange={(e) => setFormData({...formData, razorpay_key_id: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Razorpay Key Secret</label>
                  <Input
                    type="password"
                    placeholder="Enter Key Secret"
                    value={formData.razorpay_key_secret}
                    onChange={(e) => setFormData({...formData, razorpay_key_secret: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Webhook Secret (optional)</label>
                  <Input
                    type="password"
                    placeholder="Enter Webhook Secret"
                    value={formData.razorpay_webhook_secret}
                    onChange={(e) => setFormData({...formData, razorpay_webhook_secret: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_live_mode}
                      onChange={(e) => setFormData({...formData, is_live_mode: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Live Mode</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.partial_payment_enabled}
                      onChange={(e) => setFormData({...formData, partial_payment_enabled: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm">Allow Partial Payments</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Advance (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.min_advance_percent}
                    onChange={(e) => setFormData({...formData, min_advance_percent: parseFloat(e.target.value)})}
                  />
                </div>
                <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>

            {/* Test Credentials */}
            <div className="bg-card border border-border p-6">
              <h2 className="font-heading text-xl mb-4">Test Credentials</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Success Card:</span>
                  <code className="bg-muted px-3 py-2 block rounded">4111 1111 1111 1111</code>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Failure Card:</span>
                  <code className="bg-muted px-3 py-2 block rounded">4000 0000 0000 0002</code>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Test UPI:</span>
                  <code className="bg-muted px-3 py-2 block rounded">success@razorpay</code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Use any future expiry date and any 3-digit CVV</p>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl">Setup Guide</h2>
            {setupSteps.map((step) => (
              <div key={step.step} className="bg-card border border-border p-5 hover:border-accent/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{step.description}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent text-sm mt-2 inline-block hover:underline"
                      >
                        Open Razorpay Dashboard →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Troubleshooting */}
            <div className="bg-yellow-50 border border-yellow-200 p-5 mt-6">
              <h3 className="font-medium mb-2 text-yellow-800">Troubleshooting</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Payment failed? Check if keys match the mode (test/live)</li>
                <li>• Webhook not working? Verify the URL is publicly accessible</li>
                <li>• Refunds not reflecting? Ensure refund.processed event is enabled</li>
                <li>• For disputes, contact Razorpay support directly</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
