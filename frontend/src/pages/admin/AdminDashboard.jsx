import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Home, Calendar, Users, DollarSign, MessageSquare,
  Settings, LogOut, Menu, X, Plus, ChevronDown, FileText, Building,
  Edit, Trash2, Eye, Check, Phone, Mail, Search, Filter, Download,
  AlertCircle, Clock, CheckCircle, XCircle, RefreshCw
} from "lucide-react";
import { useAuth, API } from "../../App";
import { Button } from "../../components/ui/button";
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

// Villa Form Component
const VillaForm = ({ villa, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: villa?.name || "",
    slug: villa?.slug || "",
    description: villa?.description || "",
    short_description: villa?.short_description || "",
    location: villa?.location || "",
    region: villa?.region || "Goa",
    max_guests: villa?.max_guests || 6,
    bedrooms: villa?.bedrooms || 3,
    bathrooms: villa?.bathrooms || 3,
    has_pool: villa?.has_pool || false,
    base_price: villa?.base_price || 25000,
    weekend_price: villa?.weekend_price || 30000,
    minimum_nights: villa?.minimum_nights || 2,
    security_deposit: villa?.security_deposit || 10000,
    commission_percent: villa?.commission_percent || 30,
    amenities: villa?.amenities?.join(", ") || "",
    thumbnail: villa?.thumbnail || "",
    images: villa?.images?.join("\n") || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        amenities: formData.amenities.split(",").map(a => a.trim()).filter(Boolean),
        images: formData.images.split("\n").map(i => i.trim()).filter(Boolean),
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
      toast.error(error.response?.data?.detail || "Failed to save villa");
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

      <div className="grid grid-cols-4 gap-4">
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
        <div className="flex items-end gap-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <input type="checkbox" checked={formData.has_pool} onChange={(e) => setFormData({ ...formData, has_pool: e.target.checked })} />
            Has Pool
          </label>
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
        <label className="text-sm font-medium">Amenities (comma-separated)</label>
        <Input 
          value={formData.amenities} 
          onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
          placeholder="Private Pool, WiFi, AC, Kitchen..."
        />
      </div>

      <div>
        <label className="text-sm font-medium">Thumbnail URL</label>
        <Input 
          value={formData.thumbnail} 
          onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Image URLs (one per line)</label>
        <Textarea 
          value={formData.images} 
          onChange={(e) => setFormData({ ...formData, images: e.target.value })}
          rows={3}
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
      let url = `${API}/admin/bookings/${bookingId}/mark-payment?payment_type=${paymentType}&send_confirmation=${paymentType === 'full'}&payment_mode=${paymentMode}`;
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
                    {/* Payment Actions */}
                    {booking.booking_status === 'pending' && !booking.full_payment_received && (
                      <>
                        {!booking.advance_received && (
                          <Button size="sm" variant="outline" onClick={() => markPaymentReceived(booking.booking_id, 'advance')}>
                            Mark Advance
                          </Button>
                        )}
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => markPaymentReceived(booking.booking_id, 'full')}>
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
      toast.error(error.response?.data?.detail || "Failed to create booking");
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

// Razorpay Setup Guide
const RazorpaySetup = () => {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuide();
  }, []);

  const fetchGuide = async () => {
    try {
      const response = await axios.get(`${API}/admin/razorpay-setup`, { headers: getAuthHeaders() });
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
              <span className={`px-3 py-1 text-sm rounded ${
                guide.current_status.configured ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {guide.current_status.configured ? "Configured" : "Not Configured"}
              </span>
              {guide.current_status.configured && (
                <span className="text-sm text-muted-foreground">Mode: {guide.current_status.mode}</span>
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
                  <p className="text-muted-foreground whitespace-pre-line">{step.description}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Test Cards */}
          <div className="bg-card border border-border p-6">
            <h2 className="font-heading text-xl mb-4">Test Credentials</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Success Card:</span> <code className="bg-muted px-2 py-1">{guide.test_cards?.success}</code></p>
              <p><span className="text-muted-foreground">Failure Card:</span> <code className="bg-muted px-2 py-1">{guide.test_cards?.failure}</code></p>
              <p><span className="text-muted-foreground">Test UPI:</span> <code className="bg-muted px-2 py-1">{guide.test_cards?.upi}</code></p>
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
