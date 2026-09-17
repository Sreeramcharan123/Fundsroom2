import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";


const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Customer = {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  gstNumber?: string;
  type: string;
  address: string;
  status: string;
  followUpDate?: string;
  notes?: string;
  followUps?: FollowUp[];
};

type FollowUp = {
  id: number;
  customerId: number;
  createdBy: number;
  note: string;
  followUpDate: string;
  createdAt: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  reservedQuantity: number;
  minStockAlert: number;
  warehouse: string;
};

type Challan = {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: string;
  createdAt: string;
  customer?: Customer;
  items?: { id: number; productId: number; productName: string; sku: string; unitPrice: string | number; quantity: number }[];
};

type EnquiryItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  product?: Product;
};

type Enquiry = {
  id: number;
  enquiryNumber: string;
  customerId: number;
  status: string;
  notes?: string;
  createdAt: string;
  customer?: Customer;
  items?: EnquiryItem[];
  quotations?: { id: number; quotationNumber: string; status: string }[];
};

type QuotationItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string | number;
  discountPct: string | number;
  gstPct: string | number;
  baseAmount: string | number;
  discountAmount: string | number;
  gstAmount: string | number;
  lineTotal: string | number;
};

type Quotation = {
  id: number;
  quotationNumber: string;
  enquiryId: number;
  customerId: number;
  status: string;
  subtotal: string | number;
  totalDiscount: string | number;
  totalGst: string | number;
  grandTotal: string | number;
  createdAt: string;
  customer?: Customer;
  enquiry?: Enquiry;
  items?: QuotationItem[];
  salesOrders?: { id: number; orderNumber: string; status: string }[];
};

type SalesOrderItem = QuotationItem & {
  product?: Product;
};

type SalesOrder = {
  id: number;
  orderNumber: string;
  quotationId: number;
  customerId: number;
  status: string;
  subtotal: string | number;
  totalDiscount: string | number;
  totalGst: string | number;
  grandTotal: string | number;
  createdAt: string;
  dispatchedAt?: string;
  customer?: Customer;
  quotation?: Quotation;
  items?: SalesOrderItem[];
  dispatches?: { id: number; dispatchNumber: string; createdAt: string }[];
};

const canManageCustomers = (role: string) => role === "ADMIN" || role === "SALES";
const canManageProducts = (role: string) => role === "ADMIN" || role === "WAREHOUSE";
const canManageChallans = (role: string) => role === "ADMIN" || role === "SALES";
const canManageSalesFlow = (role: string) => role === "ADMIN" || role === "SALES";
const canProcessOrders = (role: string) => role === "ADMIN";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [page, setPage] = useState("Dashboard");

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setToken(res.data.token);
      setUser(res.data.user);
    } catch (error: any) {
      alert(error.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        role={user?.role || ""}
        logout={logout}
      />

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{page}</h2>
            <p>FundsRoom ERP & CRM Portal</p>
          </div>

          <div className="user-box">
            <div className="avatar">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
          </div>
        </header>

        <div className="content">
          {page === "Dashboard" && <Dashboard token={token} role={user?.role || ""} onNavigate={setPage} />}
          {page === "Customers" && <Customers token={token} role={user?.role || ""} />}
          {page === "Products" && <Products token={token} role={user?.role || ""} />}
          {page === "Enquiries" && <Enquiries token={token} role={user?.role || ""} />}
          {page === "Quotations" && <Quotations token={token} role={user?.role || ""} />}
          {page === "Sales Orders" && <SalesOrders token={token} role={user?.role || ""} />}
          {page === "Challans" && <Challans token={token} role={user?.role || ""} />}
        </div>
      </main>
    </div>
  );
}

/* LOGIN */

function Login({
  onLogin,
}: {
  onLogin: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("admin@fundsroom.com");
  const [password, setPassword] = useState("Password@123");

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <h1>FundsRoom</h1>
            <span>ERP + CRM</span>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="muted">Sign in to your operations portal</p>

        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button
          className="primary-btn login-btn"
          onClick={() => onLogin(email, password)}
        >
          Sign In
        </button>

        <div className="demo-login">
          <strong>Demo credentials</strong>
          <span>admin@fundsroom.com</span>
          <span>Password@123</span>
        </div>
      </div>
    </div>
  );
}

/* SIDEBAR */

function Sidebar({
  page,
  setPage,
  role,
  logout,
}: {
  page: string;
  setPage: (page: string) => void;
  role: string;
  logout: () => void;
}) {
  const groups: { label: string; items: [string, string][] }[] = [
    { label: "OVERVIEW", items: [["Dashboard", "⌂"]] },
    {
      label: "SALES WORKFLOW",
      items: [
        ["Enquiries", "✦"],
        ["Quotations", "▦"],
        ["Sales Orders", "▥"],
      ],
    },
    {
      label: "MASTER DATA",
      items: [
        ["Customers", "◉"],
        ["Products", "▣"],
        ["Challans", "▤"],
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="brand-icon">F</div>
        <div>
          <strong>FundsRoom</strong>
          <span>Operations</span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="menu-label">{group.label}</div>

          {group.items.map(([name, icon]) => (
            <button
              key={name}
              className={`menu-item ${page === name ? "active" : ""}`}
              onClick={() => setPage(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </div>
      ))}

      <div className="side-bottom">
        <div className="role-card">
          <small>Logged in as</small>
          <strong>{role}</strong>
        </div>

        <button className="logout-btn" onClick={logout}>
          ⇥ Logout
        </button>
      </div>
    </aside>
  );
}

/* DASHBOARD */

function Dashboard({
  token,
  role,
  onNavigate,
}: {
  token: string;
  role: string;
  onNavigate: (page: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [productsRes, enquiriesRes, quotationsRes, ordersRes] =
        await Promise.all([
          axios.get(`${API}/products?limit=100`, { headers }),
          axios.get(`${API}/enquiries?limit=100`, { headers }),
          axios.get(`${API}/quotations?limit=100`, { headers }),
          axios.get(`${API}/sales-orders?limit=100`, { headers }),
        ]);

      const pick = (data: any, key: string) =>
        Array.isArray(data) ? data : data?.data || data?.[key] || [];

      setProducts(pick(productsRes.data, "products"));
      setEnquiries(pick(enquiriesRes.data, "enquiries"));
      setQuotations(pick(quotationsRes.data, "quotations"));
      setSalesOrders(pick(ordersRes.data, "salesOrders"));
    } catch (error: any) {
      console.error("Dashboard loading failed:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  const openEnquiries = enquiries.filter(
    (e) => e.status === "NEW" || e.status === "QUOTED"
  ).length;
  const activeQuotations = quotations.filter(
    (q) => q.status === "DRAFT" || q.status === "SENT" || q.status === "ACCEPTED"
  ).length;
  const pendingOrders = salesOrders.filter((o) => o.status === "PENDING").length;
  const confirmedOrders = salesOrders.filter((o) => o.status === "CONFIRMED").length;
  const dispatchedOrders = salesOrders.filter((o) => o.status === "DISPATCHED").length;
  const availableStock = products.reduce(
    (sum, p) => sum + (Number(p.currentStock) - Number(p.reservedQuantity)),
    0
  );
  const reservedStock = products.reduce(
    (sum, p) => sum + Number(p.reservedQuantity),
    0
  );
  const lowStock = products.filter(
    (p) => Number(p.currentStock) <= Number(p.minStockAlert)
  );

  const pipeline = [
    { label: "Customer Enquiry", count: openEnquiries, note: "Open requirements", page: "Enquiries", icon: "✦" },
    { label: "Quotation", count: activeQuotations, note: "Quotes in play", page: "Quotations", icon: "▦" },
    { label: "Sales Order", count: pendingOrders, note: "Awaiting confirmation", page: "Sales Orders", icon: "▥" },
    { label: "Inventory Reservation", count: confirmedOrders, note: "Stock reserved", page: "Sales Orders", icon: "▣" },
    { label: "Dispatch", count: dispatchedOrders, note: "Orders shipped", page: "Sales Orders", icon: "↥" },
  ];

  const recentOrders = [...salesOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <>
      <section className="welcome">
        <div>
          <h1>Good day 👋</h1>
          <p>Track every deal from enquiry to dispatch.</p>
          <small style={{ color: "#667085" }}>Logged in as {role}</small>
        </div>
        <div className="date-box">
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
          })}
        </div>
      </section>

      <div className="stats">
        <StatCard title="Open Enquiries" value={loading ? "…" : String(openEnquiries)} icon="✦" />
        <StatCard title="Active Quotations" value={loading ? "…" : String(activeQuotations)} icon="▦" />
        <StatCard title="Pending Sales Orders" value={loading ? "…" : String(pendingOrders)} icon="▥" />
        <StatCard title="Available Stock" value={loading ? "…" : String(availableStock)} icon="▣" />
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Sales Workflow</h3>
            <p>Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch</p>
          </div>
          <span style={{ color: "#667085", fontSize: 12 }}>Click a stage to open it</span>
        </div>

        <div className="workflow-track">
          {pipeline.map((step, index) => (
            <button
              key={step.label}
              className="flow-node"
              onClick={() => onNavigate(step.page)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="flow-index">{index + 1}</span>
                <span className="flow-icon">{step.icon}</span>
              </div>
              <div className="flow-count">{loading ? "…" : step.count}</div>
              <strong>{step.label}</strong>
              <small>{step.note}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">
            <div><h3>Quick Actions</h3><p>Start the next step of the flow</p></div>
          </div>
          <div className="quick-grid">
            <button className="quick-action" onClick={() => onNavigate("Enquiries")}>
              <span className="quick-icon">✦</span>
              <div><strong>New Enquiry</strong><small>Capture a customer requirement</small></div>
            </button>
            <button className="quick-action" onClick={() => onNavigate("Quotations")}>
              <span className="quick-icon">▦</span>
              <div><strong>New Quotation</strong><small>Price an enquiry and send it</small></div>
            </button>
            <button className="quick-action" onClick={() => onNavigate("Sales Orders")}>
              <span className="quick-icon">▥</span>
              <div><strong>Sales Orders</strong><small>Confirm, reserve and dispatch</small></div>
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div><h3>Inventory Position</h3><p>Physical vs reserved stock</p></div>
          </div>
          <div className="overview-row"><span>Available Stock</span><b>{availableStock}</b></div>
          <div className="overview-row"><span>Reserved for Orders</span><b>{reservedStock}</b></div>
          <div className="overview-row"><span>Low Stock Products</span><b>{lowStock.length}</b></div>
          <div className="overview-row" style={{ borderBottom: "none" }}>
            <span>Pending / Confirmed Orders</span>
            <b>{pendingOrders} / {confirmedOrders}</b>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div><h3>Recent Sales Orders</h3><p>Latest orders moving through the pipeline</p></div>
          <button className="small-btn" onClick={() => onNavigate("Sales Orders")}>View all</button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty">No sales orders yet. Convert an accepted quotation to create one.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><b>{order.orderNumber}</b></td>
                    <td>{order.customer?.businessName || order.customer?.name || `Customer #${order.customerId}`}</td>
                    <td>₹{Number(order.grandTotal).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td><StatusPill status={order.status} /></td>
                    <td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  danger,
}: {
  title: string;
  value: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${danger ? "danger" : ""}`}>{icon}</div>
      <div>
        <span>{title}</span>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

/* CUSTOMERS */

type CustomerForm = {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  type: string;
  address: string;
  status: string;
  followUpDate: string;
  notes: string;
};

const emptyCustomerForm: CustomerForm = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  type: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: "",
};

function Customers({ token, role }: { token: string; role: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm);
  const [loading, setLoading] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/customers`, { headers });

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.customers || [];

      setCustomers(data);
    } catch (error: any) {
      console.error(
        "Customer loading failed:",
        error.response?.data || error.message
      );
      alert(error.response?.data?.message || "Could not load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [token]);

  const openAddForm = () => {
    setEditingCustomer(null);
    setForm(emptyCustomerForm);
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || "",
      mobile: customer.mobile || "",
      email: customer.email || "",
      businessName: customer.businessName || "",
      gstNumber: customer.gstNumber || "",
      type: customer.type || "RETAIL",
      address: customer.address || "",
      status: customer.status || "LEAD",
      followUpDate: customer.followUpDate
        ? customer.followUpDate.substring(0, 10)
        : "",
      notes: customer.notes || "",
    });

    setShowForm(true);
    setShowDetail(false);
  };

  const saveCustomer = async () => {
    if (!form.name.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!form.mobile.trim()) {
      alert("Mobile number is required");
      return;
    }

    if (!form.businessName.trim()) {
      alert("Business name is required");
      return;
    }

    try {
      const payload = {
        ...form,
        followUpDate: form.followUpDate || null,
      };

      if (editingCustomer) {
        await axios.put(
          `${API}/customers/${editingCustomer.id}`,
          payload,
          { headers }
        );

        alert("Customer updated successfully");
      } else {
        await axios.post(`${API}/customers`, payload, { headers });

        alert("Customer added successfully");
      }

      setShowForm(false);
      setEditingCustomer(null);
      setForm(emptyCustomerForm);

      await loadCustomers();
    } catch (error: any) {
      console.error(
        "Customer save failed:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          (editingCustomer
            ? "Could not update customer"
            : "Could not add customer")
      );
    }
  };

  const viewCustomer = async (customer: Customer) => {
    try {
      const res = await axios.get(`${API}/customers/${customer.id}`, { headers });
      const detail = res.data?.customer || res.data?.data || customer;
      setSelectedCustomer(detail);
      setFollowUpNote("");
      setFollowUpDate("");
      setShowDetail(true);
    } catch (error: any) {
      console.error("Customer detail loading failed:", error.response?.data || error.message);
      setSelectedCustomer(customer);
      setShowDetail(true);
    }
  };

  const addFollowUp = async () => {
    if (!selectedCustomer) return;
    if (!followUpNote.trim()) {
      alert("Please enter a follow-up note");
      return;
    }

    try {
      setFollowUpLoading(true);
      await axios.post(
        `${API}/customers/${selectedCustomer.id}/follow-ups`,
        {
          note: followUpNote.trim(),
          followUpDate: followUpDate || undefined,
        },
        { headers }
      );
      alert("Follow-up added successfully");
      const res = await axios.get(`${API}/customers/${selectedCustomer.id}`, { headers });
      const detail = res.data?.customer || selectedCustomer;
      setSelectedCustomer(detail);
      setFollowUpNote("");
      setFollowUpDate("");
      await loadCustomers();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not add follow-up");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      c.name?.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.gstNumber?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  return (
    <section>
      <PageHeading
        title="Customers"
        subtitle="Manage customer relationships and follow-ups"
        button="+ Add Customer"
        onClick={openAddForm}
        showButton={canManageCustomers(role)}
      />

      {showForm && (
        <Modal
          title={editingCustomer ? "Edit Customer" : "Add Customer"}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        >
          <div className="form-grid">
            <Field
              label="Customer Name *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />

            <Field
              label="Mobile *"
              value={form.mobile}
              onChange={(v) => setForm({ ...form, mobile: v })}
            />

            <Field
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />

            <Field
              label="Business Name *"
              value={form.businessName}
              onChange={(v) => setForm({ ...form, businessName: v })}
            />

            <Field
              label="GST Number"
              value={form.gstNumber}
              onChange={(v) => setForm({ ...form, gstNumber: v })}
            />

            <SelectField
              label="Customer Type"
              value={form.type}
              options={["RETAIL", "WHOLESALE", "DISTRIBUTOR"]}
              onChange={(v) => setForm({ ...form, type: v })}
            />

            <SelectField
              label="Status"
              value={form.status}
              options={["LEAD", "ACTIVE", "INACTIVE"]}
              onChange={(v) => setForm({ ...form, status: v })}
            />

            <Field
              label="Follow-up Date"
              value={form.followUpDate}
              onChange={(v) => setForm({ ...form, followUpDate: v })}
            />
          </div>

          <Field
            label="Address"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />

          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="primary-btn" onClick={saveCustomer}>
              {editingCustomer ? "Update Customer" : "Save Customer"}
            </button>

            <button
              className="small-btn"
              onClick={() => {
                setShowForm(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showDetail && selectedCustomer && (
        <Modal
          title="Customer Details"
          onClose={() => setShowDetail(false)}
        >
          <div className="detail-grid">
            <div>
              <strong>Customer Name</strong>
              <p>{selectedCustomer.name || "-"}</p>
            </div>

            <div>
              <strong>Business Name</strong>
              <p>{selectedCustomer.businessName || "-"}</p>
            </div>

            <div>
              <strong>Mobile</strong>
              <p>{selectedCustomer.mobile || "-"}</p>
            </div>

            <div>
              <strong>Email</strong>
              <p>{selectedCustomer.email || "-"}</p>
            </div>

            <div>
              <strong>GST Number</strong>
              <p>{selectedCustomer.gstNumber || "-"}</p>
            </div>

            <div>
              <strong>Customer Type</strong>
              <p>
                <span className="badge neutral">
                  {selectedCustomer.type || "-"}
                </span>
              </p>
            </div>

            <div>
              <strong>Status</strong>
              <p>
                <span
                  className={`badge ${
                    selectedCustomer.status?.toLowerCase() || "neutral"
                  }`}
                >
                  {selectedCustomer.status || "-"}
                </span>
              </p>
            </div>

            <div>
              <strong>Follow-up Date</strong>
              <p>
                {selectedCustomer.followUpDate
                  ? new Date(
                      selectedCustomer.followUpDate
                    ).toLocaleDateString("en-IN")
                  : "-"}
              </p>
            </div>

            <div className="detail-full">
              <strong>Address</strong>
              <p>{selectedCustomer.address || "-"}</p>
            </div>

            <div className="detail-full">
              <strong>Notes / Follow-up Notes</strong>
              <p>{selectedCustomer.notes || "No notes added."}</p>
            </div>
          </div>

          <div className="panel" style={{ marginTop: "18px" }}>
            <div className="panel-title">
              <div>
                <h3>Follow-up</h3>
                <p>Add a customer interaction note and next follow-up date</p>
              </div>
            </div>

            <Field
              label="Follow-up Note *"
              value={followUpNote}
              onChange={setFollowUpNote}
            />

            <Field
              label="Follow-up Date"
              value={followUpDate}
              onChange={setFollowUpDate}
            />

{canManageCustomers(role) && (
              <button className="primary-btn" onClick={addFollowUp} disabled={followUpLoading}>
                {followUpLoading ? "Adding..." : "Add Follow-up"}
              </button>
            )}

            <div style={{ marginTop: "18px" }}>
              <strong>Follow-up History</strong>
              {selectedCustomer.followUps?.length ? (
                <div style={{ marginTop: "10px" }}>
                  {selectedCustomer.followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "10px",
                        marginBottom: "8px",
                      }}
                    >
                      <strong>{followUp.note}</strong>
                      <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                        Follow-up: {new Date(followUp.followUpDate).toLocaleDateString("en-IN")} ·
                        Added: {new Date(followUp.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty" style={{ marginTop: "10px" }}>No follow-up history yet.</p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button
              className="primary-btn"
              onClick={() => openEditForm(selectedCustomer)}
            >
              Edit Customer
            </button>
          </div>
        </Modal>
      )}

      <div className="panel">
        <div className="toolbar">
          <input
            className="search"
            placeholder="Search by name, business, mobile, email, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <span>
            {loading ? "Loading..." : `${filtered.length} customers`}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                  </td>

                  <td>{customer.businessName}</td>

                  <td>{customer.mobile}</td>

                  <td>
                    <span className="badge neutral">
                      {customer.type}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        customer.status?.toLowerCase() || "neutral"
                      }`}
                    >
                      {customer.status}
                    </span>
                  </td>

                  <td>
                    {customer.followUpDate
                      ? new Date(
                          customer.followUpDate
                        ).toLocaleDateString("en-IN")
                      : "-"}
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="small-btn"
                        onClick={() => viewCustomer(customer)}
                      >
                        View
                      </button>

{canManageCustomers(role) && (
                        <button className="small-btn" onClick={() => openEditForm(customer)}>Edit</button>
                      )}


                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    {search
                      ? "No customers match your search"
                      : "No customers found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* PRODUCTS */

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  warehouse: string;
};

const emptyProductForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "10",
  warehouse: "",
};

function Products({ token, role }: { token: string; role: string }) {
  type Movement = {
    id: number;
    productId: number;
    quantity: number;
    type: "IN" | "OUT";
    reason: string;
    createdAt: string;
    createdBy: number;
    product?: { id: number; name: string; sku: string };
    user?: { id: number; name: string; email: string; role: string };
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [stockForm, setStockForm] = useState({
    quantity: "",
    reason: "",
  });

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/products`, { headers });

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.products || [];

      setProducts(data);
    } catch (error: any) {
      console.error(
        "Product loading failed:",
        error.response?.data || error.message
      );
      alert(error.response?.data?.message || "Could not load products");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await axios.get(`${API}/products/stock-movements`, {
        headers,
      });

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.movements || [];

      setMovements(data);
    } catch (error: any) {
      console.error(
        "Stock movement loading failed:",
        error.response?.data || error.message
      );
      alert(
        error.response?.data?.message || "Could not load stock movements"
      );
    }
  };

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, [token]);

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(emptyProductForm);
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      unitPrice: String(product.unitPrice ?? ""),
      currentStock: String(product.currentStock ?? 0),
      minStockAlert: String(product.minStockAlert ?? 10),
      warehouse: product.warehouse || "",
    });

    setShowForm(true);
  };

  const openStockForm = (product: Product) => {
    setSelectedProduct(product);
    setStockForm({
      quantity: "",
      reason: "",
    });
    setShowStockForm(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) {
      alert("Product name is required");
      return;
    }

    if (!form.sku.trim()) {
      alert("SKU is required");
      return;
    }

    if (!form.category.trim()) {
      alert("Category is required");
      return;
    }

    const unitPrice = Number(form.unitPrice);
    const currentStock = Number(form.currentStock);
    const minStockAlert = Number(form.minStockAlert);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      alert("Enter a valid unit price");
      return;
    }

    if (!Number.isInteger(currentStock) || currentStock < 0) {
      alert("Initial stock must be a non-negative whole number");
      return;
    }

    if (!Number.isInteger(minStockAlert) || minStockAlert < 0) {
      alert("Minimum stock alert must be a non-negative whole number");
      return;
    }

    try {
      if (editingProduct) {
        // Backend intentionally does not edit currentStock here.
        await axios.put(
          `${API}/products/${editingProduct.id}`,
          {
            name: form.name.trim(),
            sku: form.sku.trim(),
            category: form.category.trim(),
            unitPrice,
            minStockAlert,
            warehouse: form.warehouse.trim(),
          },
          { headers }
        );

        alert("Product updated successfully");
      } else {
        await axios.post(
          `${API}/products`,
          {
            name: form.name.trim(),
            sku: form.sku.trim(),
            category: form.category.trim(),
            unitPrice,
            currentStock,
            minStockAlert,
            warehouse: form.warehouse.trim(),
          },
          { headers }
        );

        alert("Product added successfully");
      }

      setShowForm(false);
      setEditingProduct(null);
      setForm(emptyProductForm);

      await Promise.all([loadProducts(), loadMovements()]);
    } catch (error: any) {
      console.error(
        "Product save failed:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          (editingProduct
            ? "Could not update product"
            : "Could not add product")
      );
    }
  };

  const addStock = async () => {
    if (!selectedProduct) return;

    const quantity = Number(stockForm.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Enter a valid positive whole number");
      return;
    }

    if (!stockForm.reason.trim()) {
      alert("Please enter a reason for the stock movement");
      return;
    }

    try {
      setStockLoading(true);

      await axios.post(
        `${API}/products/${selectedProduct.id}/stock`,
        {
          quantity,
          reason: stockForm.reason.trim(),
        },
        { headers }
      );

      alert(
        `Stock added successfully. ${selectedProduct.name} increased by ${quantity} units.`
      );

      setShowStockForm(false);
      setSelectedProduct(null);
      setStockForm({ quantity: "", reason: "" });

      await Promise.all([loadProducts(), loadMovements()]);
    } catch (error: any) {
      console.error(
        "Stock update failed:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message || "Could not add stock"
      );
    } finally {
      setStockLoading(false);
    }
  };

  const openMovementLog = async () => {
    await loadMovements();
    setShowMovements(true);
  };

  const filtered = products.filter((product) => {
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      product.name?.toLowerCase().includes(q) ||
      product.sku?.toLowerCase().includes(q) ||
      product.category?.toLowerCase().includes(q) ||
      product.warehouse?.toLowerCase().includes(q)
    );
  });

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.currentStock) <= Number(product.minStockAlert)
  );

  const totalIn = movements
    .filter((movement) => movement.type === "IN")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  const totalOut = movements
    .filter((movement) => movement.type === "OUT")
    .reduce((total, movement) => total + Number(movement.quantity || 0), 0);

  return (
    <section>
      <PageHeading
        title="Products & Inventory"
        subtitle="Manage products, stock levels and warehouses"
        button="+ Add Product"
        onClick={openAddForm}
        showButton={canManageProducts(role)}
      />

      <div className="stats">
        <StatCard
          title="Total Products"
          value={String(products.length)}
          icon="▣"
        />

        <StatCard
          title="Low Stock"
          value={String(lowStockProducts.length)}
          icon="!"
          danger
        />

        <StatCard
          title="Stock In"
          value={String(totalIn)}
          icon="↑"
        />

        <StatCard
          title="Stock Out"
          value={String(totalOut)}
          icon="↓"
        />
      </div>

      {showForm && (
        <Modal
          title={editingProduct ? "Edit Product" : "Add Product"}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        >
          <div className="form-grid">
            <Field
              label="Product Name *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />

            <Field
              label="SKU / Code *"
              value={form.sku}
              onChange={(v) => setForm({ ...form, sku: v })}
            />

            <Field
              label="Category *"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />

            <Field
              label="Unit Price *"
              value={form.unitPrice}
              onChange={(v) => setForm({ ...form, unitPrice: v })}
            />

            {!editingProduct && (
              <Field
                label="Initial Stock"
                value={form.currentStock}
                onChange={(v) => setForm({ ...form, currentStock: v })}
              />
            )}

            <Field
              label="Minimum Stock Alert *"
              value={form.minStockAlert}
              onChange={(v) => setForm({ ...form, minStockAlert: v })}
            />

            <Field
              label="Warehouse"
              value={form.warehouse}
              onChange={(v) => setForm({ ...form, warehouse: v })}
            />
          </div>

          {editingProduct && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                opacity: 0.75,
              }}
            >
              Current stock is changed through Stock In or Sales Challan
              movements, so inventory history remains accurate.
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="primary-btn" onClick={saveProduct}>
              {editingProduct ? "Update Product" : "Save Product"}
            </button>

            <button
              className="small-btn"
              onClick={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showStockForm && selectedProduct && (
        <Modal
          title={`Add Stock — ${selectedProduct.name}`}
          onClose={() => {
            setShowStockForm(false);
            setSelectedProduct(null);
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "16px",
              borderRadius: "10px",
              background: "rgba(0,0,0,0.04)",
            }}
          >
            <strong>Current stock: {selectedProduct.currentStock}</strong>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              SKU: {selectedProduct.sku}
            </div>
          </div>

          <Field
            label="Quantity *"
            value={stockForm.quantity}
            onChange={(v) =>
              setStockForm({ ...stockForm, quantity: v })
            }
          />

          <Field
            label="Reason *"
            value={stockForm.reason}
            onChange={(v) =>
              setStockForm({ ...stockForm, reason: v })
            }
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              className="primary-btn"
              onClick={addStock}
              disabled={stockLoading}
            >
              {stockLoading ? "Adding..." : "Add Stock"}
            </button>

            <button
              className="small-btn"
              onClick={() => {
                setShowStockForm(false);
                setSelectedProduct(null);
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showMovements && (
        <Modal
          title="Stock Movement Log"
          onClose={() => setShowMovements(false)}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <strong>
                        {movement.product?.name ||
                          `Product #${movement.productId}`}
                      </strong>
                      <div style={{ fontSize: "12px", opacity: 0.7 }}>
                        {movement.product?.sku || ""}
                      </div>
                    </td>

                    <td>{movement.quantity}</td>

                    <td>
                      <span
                        className={`badge ${
                          movement.type === "IN"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {movement.type}
                      </span>
                    </td>

                    <td>{movement.reason}</td>

                    <td>
                      {movement.user?.name ||
                        `User #${movement.user?.id || movement.createdBy}`}
                    </td>

                    <td>
                      {new Date(movement.createdAt).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}

                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No stock movements found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      <div className="panel">
        <div className="toolbar">
          <input
            className="search"
            placeholder="Search by product, SKU, category, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>
              {loading ? "Loading..." : `${filtered.length} products`}
            </span>

            <button className="small-btn" onClick={openMovementLog}>
              View Stock Movements
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Warehouse</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((product) => {
                const low =
                  Number(product.currentStock) <=
                  Number(product.minStockAlert);

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.sku}</td>

                    <td>{product.category}</td>

                    <td>₹{product.unitPrice}</td>

                    <td>
                      <span className={`stock ${low ? "low" : ""}`}>
                        {product.currentStock}
                        {low && " ⚠"}
                      </span>
                    </td>

                    <td>{product.warehouse || "-"}</td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {canManageProducts(role) && (
                          <>
                            <button className="small-btn" onClick={() => openEditForm(product)}>Edit</button>
                            <button className="small-btn" onClick={() => openStockForm(product)}>+ Stock</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    {search
                      ? "No products match your search"
                      : "No products found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Low Stock Alerts</h3>
            <p>Products at or below their minimum stock threshold</p>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="empty">✓ No low stock products</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Minimum Alert</th>
                  <th>Warehouse</th>
                </tr>
              </thead>

              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.sku}</td>
                    <td>
                      <span className="stock low">
                        {product.currentStock} ⚠
                      </span>
                    </td>
                    <td>{product.minStockAlert}</td>
                    <td>{product.warehouse || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}


/* CHALLANS */

function Challans({ token, role }: { token: string; role: string }) {
  type ChallanItemDraft = {
    productId: string;
    quantity: string;
  };

  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<ChallanItemDraft[]>([
    { productId: "", quantity: "1" },
  ]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      setLoading(true);
      const [customersRes, productsRes, challansRes] = await Promise.all([
        axios.get(`${API}/customers`, { headers }),
        axios.get(`${API}/products`, { headers }),
        axios.get(`${API}/challans?limit=100`, { headers }),
      ]);

      const customerData = Array.isArray(customersRes.data)
        ? customersRes.data
        : customersRes.data?.data || customersRes.data?.customers || [];
      const productData = Array.isArray(productsRes.data)
        ? productsRes.data
        : productsRes.data?.data || productsRes.data?.products || [];
      const challanData = Array.isArray(challansRes.data)
        ? challansRes.data
        : challansRes.data?.data || challansRes.data?.challans || [];

      setCustomers(customerData);
      setProducts(productData);
      setChallans(challanData);
    } catch (error: any) {
      console.error("Failed to load challan data:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Could not load challan data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const updateItem = (index: number, field: keyof ChallanItemDraft, value: string) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((current) => [...current, { productId: "", quantity: "1" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", quantity: "1" }]);
      return;
    }
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCustomerId("");
    setItems([{ productId: "", quantity: "1" }]);
  };

  const totalQuantity = items.reduce((total, item) => {
    const qty = Number(item.quantity);
    return total + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);

  const createChallan = async () => {
    if (!customerId) {
      alert("Please select a customer");
      return;
    }

    if (items.some((item) => !item.productId)) {
      alert("Please select a product for every row");
      return;
    }

    if (items.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      alert("Every quantity must be a positive whole number");
      return;
    }

    const productIds = items.map((item) => Number(item.productId));
    if (new Set(productIds).size !== productIds.length) {
      alert("Please select each product only once");
      return;
    }

    try {
      setActionLoading(-1);
      await axios.post(
        `${API}/challans`,
        {
          customerId: Number(customerId),
          status: "DRAFT",
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          })),
        },
        { headers }
      );

      alert("Draft challan created successfully");
      resetForm();
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not create challan");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmChallan = async (id: number) => {
    try {
      setActionLoading(id);
      await axios.post(`${API}/challans/${id}/confirm`, {}, { headers });
      alert("Challan confirmed and stock updated");
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not confirm challan");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelChallan = async (id: number) => {
    if (!window.confirm("Cancel this draft challan?")) return;

    try {
      setActionLoading(id);
      await axios.post(`${API}/challans/${id}/cancel`, {}, { headers });
      alert("Challan cancelled successfully");
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not cancel challan");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section>
      <PageHeading
        title="Sales Challans"
        subtitle="Create, confirm and manage sales challans"
      />

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <h3>Create Challan</h3>
              <p>Add one or more products and save as draft</p>
            </div>
          </div>

          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} — {c.businessName}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <strong>Products</strong>
              <button type="button" className="small-btn" onClick={addItem}>
                + Add Product
              </button>
            </div>

            {items.map((item, index) => {
              const selected = products.find((p) => p.id === Number(item.productId));
              return (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 110px auto",
                    gap: "8px",
                    alignItems: "end",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <label style={{ fontSize: "12px" }}>Product {index + 1}</label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name} — Stock {p.currentStock}
                        </option>
                      ))}
                    </select>
                    {selected && (
                      <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "3px" }}>
                        SKU: {selected.sku} · ₹{selected.unitPrice}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: "12px" }}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => removeItem(index)}
                    title="Remove product"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              marginTop: "14px",
              marginBottom: "14px",
              borderRadius: "10px",
              background: "rgba(0,0,0,0.04)",
            }}
          >
            <span>Total Products: {items.length}</span>
            <strong>Total Quantity: {totalQuantity}</strong>
          </div>

          {canManageChallans(role) ? (
            <button className="primary-btn" onClick={createChallan} disabled={actionLoading === -1}>
              {actionLoading === -1 ? "Creating..." : "Create Draft Challan"}
            </button>
          ) : (
            <p style={{ opacity: 0.7, fontSize: "13px" }}>Read-only access. Only Admin and Sales can create challans.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <h3>Challan Workflow</h3>
              <p>Draft → Confirmed / Cancelled</p>
            </div>
          </div>

          <div className="workflow">
            <div className="workflow-step">
              <span>1</span>
              <div>
                <strong>Create Draft</strong>
                <p>Customer + multiple products + quantities</p>
              </div>
            </div>

            <div className="workflow-line" />

            <div className="workflow-step">
              <span>2</span>
              <div>
                <strong>Confirm Challan</strong>
                <p>Stock is reduced for every product</p>
              </div>
            </div>

            <div className="workflow-line" />

            <div className="workflow-step">
              <span>3</span>
              <div>
                <strong>Cancel Draft</strong>
                <p>No stock is deducted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Recent Challans</h3>
            <p>{loading ? "Loading records..." : "Sales challan records"}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Customer</th>
                <th>Products</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {challans.map((ch) => {
                const customer = customers.find((c) => c.id === ch.customerId);
                const busy = actionLoading === ch.id;
                const itemCount = (ch as any).items?.length;

                return (
                  <tr key={ch.id}>
                    <td><strong>{ch.challanNumber}</strong></td>
                    <td>{customer?.name || `Customer #${ch.customerId}`}</td>
                    <td>{itemCount ?? "—"}</td>
                    <td>{ch.totalQuantity}</td>
                    <td>
                      <span className={`badge ${ch.status.toLowerCase()}`}>
                        {ch.status}
                      </span>
                    </td>
                    <td>{new Date(ch.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      {ch.status === "DRAFT" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {canManageChallans(role) && (
                            <>
                              <button className="small-btn" onClick={() => confirmChallan(ch.id)} disabled={busy}>
                                {busy ? "..." : "Confirm"}
                              </button>
                              <button className="small-btn" onClick={() => cancelChallan(ch.id)} disabled={busy}>
                                Cancel
                              </button>
                            </>
                          )}
                          {!canManageChallans(role) && <span style={{ opacity: 0.7 }}>Read-only</span>}
                        </div>
                      ) : ch.status === "CONFIRMED" ? (
                        <span className="confirmed">✓ Confirmed</span>
                      ) : (
                        <span style={{ opacity: 0.7 }}>Cancelled</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {challans.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No challans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ENQUIRIES */

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEW: "#2563eb",
    DRAFT: "#6b7280",
    PENDING: "#d97706",
    QUOTED: "#7c3aed",
    SENT: "#0ea5e9",
    WON: "#16a34a",
    ACCEPTED: "#16a34a",
    CONFIRMED: "#0ea5e9",
    DISPATCHED: "#065f46",
    LOST: "#dc2626",
    REJECTED: "#dc2626",
    CANCELLED: "#dc2626",
  };

  const color = colors[status] || "#6b7280";

  return (
    <span className="badge" style={{ background: `${color}1a`, color }}>
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`summary-card ${active ? "active" : ""}`}
      onClick={onClick}
      style={active ? { borderColor: color } : undefined}
    >
      <span>{label}</span>
      <b style={{ color }}>{value}</b>
    </button>
  );
}

type EnquiryFormItem = { productId: string; quantity: string };

const emptyEnquiryItem: EnquiryFormItem = { productId: "", quantity: "1" };

function Enquiries({ token, role }: { token: string; role: string }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EnquiryFormItem[]>([emptyEnquiryItem]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const [enqRes, custRes, prodRes] = await Promise.all([
        axios.get(`${API}/enquiries?limit=100`, { headers }),
        axios.get(`${API}/customers?limit=100`, { headers }),
        axios.get(`${API}/products?limit=100`, { headers }),
      ]);

      setEnquiries(enqRes.data?.data || []);
      setCustomers(custRes.data?.data || []);
      setProducts(prodRes.data?.data || []);
    } catch (error: any) {
      console.error("Enquiry load failed:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const updateItem = (index: number, field: keyof EnquiryFormItem, value: string) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((current) => [...current, { ...emptyEnquiryItem }]);

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ ...emptyEnquiryItem }]);
      return;
    }
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const createEnquiry = async () => {
    if (!customerId) {
      alert("Please select a customer");
      return;
    }

    if (items.some((item) => !item.productId)) {
      alert("Please select a product for every row");
      return;
    }

    if (
      items.some(
        (item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0
      )
    ) {
      alert("Every quantity must be a positive whole number");
      return;
    }

    const productIds = items.map((item) => Number(item.productId));
    if (new Set(productIds).size !== productIds.length) {
      alert("Please select each product only once");
      return;
    }

    try {
      setBusy(true);
      await axios.post(
        `${API}/enquiries`,
        {
          customerId: Number(customerId),
          notes,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          })),
        },
        { headers }
      );

      alert("Enquiry created successfully");
      setCustomerId("");
      setNotes("");
      setItems([{ ...emptyEnquiryItem }]);
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not create enquiry");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      setBusy(true);
      await axios.patch(`${API}/enquiries/${id}/status`, { status }, { headers });
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not update enquiry status");
    } finally {
      setBusy(false);
    }
  };

  const statusCounts = {
    NEW: enquiries.filter((e) => e.status === "NEW").length,
    QUOTED: enquiries.filter((e) => e.status === "QUOTED").length,
    WON: enquiries.filter((e) => e.status === "WON").length,
    LOST: enquiries.filter((e) => e.status === "LOST").length,
  };

  const visibleEnquiries =
    statusFilter === "ALL"
      ? enquiries
      : enquiries.filter((e) => e.status === statusFilter);

  return (
    <section>
      <PageHeading
        title="Customer Enquiries"
        subtitle="Capture requirements before sending a quotation"
      />

      <div className="summary-row">
        <SummaryCard label="All Enquiries" value={enquiries.length} color="#111827" active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
        <SummaryCard label="New" value={statusCounts.NEW} color="#2563eb" active={statusFilter === "NEW"} onClick={() => setStatusFilter("NEW")} />
        <SummaryCard label="Quoted" value={statusCounts.QUOTED} color="#7c3aed" active={statusFilter === "QUOTED"} onClick={() => setStatusFilter("QUOTED")} />
        <SummaryCard label="Won" value={statusCounts.WON} color="#16a34a" active={statusFilter === "WON"} onClick={() => setStatusFilter("WON")} />
        <SummaryCard label="Lost" value={statusCounts.LOST} color="#dc2626" active={statusFilter === "LOST"} onClick={() => setStatusFilter("LOST")} />
      </div>

      {canManageSalesFlow(role) && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h3>New Enquiry</h3>
              <p>Select a customer and the products they are asking about</p>
            </div>
          </div>

          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} — {c.businessName}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong>Products</strong>
              <button type="button" className="small-btn" onClick={addItem}>
                + Add Product
              </button>
            </div>

            {items.map((item, index) => {
              const product = products.find((p) => p.id === Number(item.productId));
              return (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 110px auto",
                    gap: 8,
                    alignItems: "end",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <label style={{ fontSize: 12 }}>Product {index + 1}</label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name} — Avail {Number(p.currentStock)}
                        </option>
                      ))}
                    </select>
                    {product && (
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>
                        SKU: {product.sku} · ₹{product.unitPrice}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: 12 }}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>

                  <button type="button" className="small-btn" onClick={() => removeItem(index)}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <Field label="Notes" value={notes} onChange={setNotes} />

          <button className="primary-btn" onClick={createEnquiry} disabled={busy}>
            {busy ? "Creating..." : "Create Enquiry"}
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Enquiry Management</h3>
            <p>
              {statusFilter === "ALL"
                ? `${enquiries.length} enquiry records`
                : `${visibleEnquiries.length} of ${enquiries.length} enquiries · ${statusFilter}`}
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Enquiry</th>
                <th>Customer</th>
                <th>Products Requested</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEnquiries.map((enquiry) => (
                <tr key={enquiry.id}>
                  <td><strong>{enquiry.enquiryNumber}</strong></td>
                  <td>
                    <div>{enquiry.customer?.name || `Customer #${enquiry.customerId}`}</div>
                    {enquiry.customer?.businessName && (
                      <small style={{ color: "#8a94a6" }}>{enquiry.customer.businessName}</small>
                    )}
                  </td>
                  <td>
                    {(enquiry.items || []).length === 0 ? (
                      <span style={{ color: "#8a94a6" }}>—</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {(enquiry.items || []).map((item) => (
                          <small key={item.id}>
                            {item.productName} × {item.quantity}
                          </small>
                        ))}
                      </div>
                    )}
                  </td>
                  <td><StatusPill status={enquiry.status} /></td>
                  <td>{new Date(enquiry.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="small-btn" onClick={() => setSelected(enquiry)}>
                        View
                      </button>
                      {canManageSalesFlow(role) && enquiry.status === "NEW" && (
                        <button className="small-btn" onClick={() => updateStatus(enquiry.id, "QUOTED")} disabled={busy}>
                          Mark Quoted
                        </button>
                      )}
                      {canManageSalesFlow(role) && enquiry.status === "QUOTED" && (
                        <>
                          <button className="small-btn" onClick={() => updateStatus(enquiry.id, "WON")} disabled={busy}>
                            Won
                          </button>
                          <button className="small-btn" onClick={() => updateStatus(enquiry.id, "LOST")} disabled={busy}>
                            Lost
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {visibleEnquiries.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">No enquiries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Enquiry ${selected.enquiryNumber}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div>
              <strong>Customer</strong>
              <p>{selected.customer?.name || "-"}</p>
            </div>
            <div>
              <strong>Status</strong>
              <p><StatusPill status={selected.status} /></p>
            </div>
            <div>
              <strong>Business</strong>
              <p>{selected.customer?.businessName || "-"}</p>
            </div>
            <div>
              <strong>Created</strong>
              <p>{new Date(selected.createdAt).toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {(selected.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.notes && (
            <p style={{ marginTop: 12, opacity: 0.8 }}>
              <strong>Notes:</strong> {selected.notes}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}

/* QUOTATIONS */

type QuoteRow = {
  productId: number;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discountPct: string;
  gstPct: string;
};

function Quotations({ token, role }: { token: string; role: string }) {
  type EnquiryOption = Enquiry & { items: EnquiryItem[] };

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryOption[]>([]);
  const [enquiryId, setEnquiryId] = useState("");
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const [quoRes, enqRes] = await Promise.all([
        axios.get(`${API}/quotations?limit=100`, { headers }),
        axios.get(`${API}/enquiries?limit=100`, { headers }),
      ]);

      setQuotations(quoRes.data?.data || []);
      setEnquiries(
        (enqRes.data?.data || []).filter(
          (enquiry: EnquiryOption) => enquiry.items && enquiry.items.length > 0
        )
      );
    } catch (error: any) {
      console.error("Quotation load failed:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const selectEnquiry = (value: string) => {
    setEnquiryId(value);
    const enquiry = enquiries.find((e) => String(e.id) === value);

    if (!enquiry?.items) {
      setRows([]);
      return;
    }

    setRows(
      enquiry.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unitPrice: Number(item.product?.unitPrice ?? 0),
        quantity: item.quantity,
        discountPct: "0",
        gstPct: "18",
      }))
    );
  };

  const updateRow = (index: number, field: keyof QuoteRow, value: string) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const previewTotals = rows.reduce(
    (acc, row) => {
      const base = row.quantity * row.unitPrice;
      const discount = (base * Number(row.discountPct || 0)) / 100;
      const taxable = base - discount;
      const gst = (taxable * Number(row.gstPct || 0)) / 100;
      acc.subtotal += base;
      acc.discount += discount;
      acc.gst += gst;
      acc.total += taxable + gst;
      return acc;
    },
    { subtotal: 0, discount: 0, gst: 0, total: 0 }
  );

  const createQuotation = async () => {
    if (!enquiryId) {
      alert("Please select an enquiry");
      return;
    }

    if (rows.length === 0) {
      alert("The selected enquiry has no products");
      return;
    }

    try {
      setBusy(true);
      await axios.post(
        `${API}/quotations`,
        {
          enquiryId: Number(enquiryId),
          validUntil: validUntil || undefined,
          items: rows.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            discountPct: Number(row.discountPct || 0),
            gstPct: Number(row.gstPct || 0),
          })),
        },
        { headers }
      );

      alert("Quotation created successfully");
      setEnquiryId("");
      setRows([]);
      setValidUntil("");
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not create quotation");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    try {
      setBusy(true);
      await axios.patch(`${API}/quotations/${id}/status`, { status }, { headers });
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not update quotation");
    } finally {
      setBusy(false);
    }
  };

  const convert = async (id: number) => {
    try {
      setBusy(true);
      const res = await axios.post(`${API}/quotations/${id}/convert`, {}, { headers });
      alert(`Sales Order ${res.data?.salesOrder?.orderNumber || ""} created`);
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not convert quotation");
    } finally {
      setBusy(false);
    }
  };

  const statusCounts = {
    DRAFT: quotations.filter((q) => q.status === "DRAFT").length,
    SENT: quotations.filter((q) => q.status === "SENT").length,
    ACCEPTED: quotations.filter((q) => q.status === "ACCEPTED").length,
    REJECTED: quotations.filter((q) => q.status === "REJECTED").length,
  };

  const visibleQuotations =
    statusFilter === "ALL"
      ? quotations
      : quotations.filter((q) => q.status === statusFilter);

  return (
    <section>
      <PageHeading
        title="Quotations"
        subtitle="Price the enquiry, send it and convert accepted quotes"
      />

      <div className="summary-row">
        <SummaryCard label="All Quotations" value={quotations.length} color="#111827" active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
        <SummaryCard label="Draft" value={statusCounts.DRAFT} color="#6b7280" active={statusFilter === "DRAFT"} onClick={() => setStatusFilter("DRAFT")} />
        <SummaryCard label="Sent" value={statusCounts.SENT} color="#0ea5e9" active={statusFilter === "SENT"} onClick={() => setStatusFilter("SENT")} />
        <SummaryCard label="Accepted" value={statusCounts.ACCEPTED} color="#16a34a" active={statusFilter === "ACCEPTED"} onClick={() => setStatusFilter("ACCEPTED")} />
        <SummaryCard label="Rejected" value={statusCounts.REJECTED} color="#dc2626" active={statusFilter === "REJECTED"} onClick={() => setStatusFilter("REJECTED")} />
      </div>

      {canManageSalesFlow(role) && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h3>New Quotation</h3>
              <p>Totals are calculated and validated by the backend</p>
            </div>
          </div>

          <label>Enquiry *</label>
          <select value={enquiryId} onChange={(e) => selectEnquiry(e.target.value)}>
            <option value="">Select enquiry</option>
            {enquiries.map((enquiry) => (
              <option value={enquiry.id} key={enquiry.id}>
                {enquiry.enquiryNumber} — {enquiry.customer?.name || `Customer #${enquiry.customerId}`} ({enquiry.status})
              </option>
            ))}
          </select>

          {rows.length > 0 && (
            <>
              <div className="table-wrap" style={{ marginTop: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Discount %</th>
                      <th>GST %</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const base = row.quantity * row.unitPrice;
                      const discount = (base * Number(row.discountPct || 0)) / 100;
                      const gst = ((base - discount) * Number(row.gstPct || 0)) / 100;
                      const lineTotal = base - discount + gst;

                      return (
                        <tr key={row.productId}>
                          <td>
                            <strong>{row.productName}</strong>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>{row.sku}</div>
                          </td>
                          <td>{row.quantity}</td>
                          <td>₹{row.unitPrice}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discountPct}
                              onChange={(e) => updateRow(index, "discountPct", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.gstPct}
                              onChange={(e) => updateRow(index, "gstPct", e.target.value)}
                            />
                          </td>
                          <td>₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  marginTop: 14,
                  marginBottom: 14,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.04)",
                }}
              >
                <span>Subtotal ₹{previewTotals.subtotal.toFixed(2)} · Discount ₹{previewTotals.discount.toFixed(2)} · GST ₹{previewTotals.gst.toFixed(2)}</span>
                <strong>Total ₹{previewTotals.total.toFixed(2)}</strong>
              </div>
            </>
          )}

          <Field label="Valid Until" value={validUntil} onChange={setValidUntil} />

          <button className="primary-btn" onClick={createQuotation} disabled={busy}>
            {busy ? "Creating..." : "Create Quotation"}
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Quotation Register</h3>
            <p>
              {statusFilter === "ALL"
                ? `${quotations.length} quotation records`
                : `${visibleQuotations.length} of ${quotations.length} quotations · ${statusFilter}`}
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>GST</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuotations.map((quotation) => {
                const converted = (quotation.salesOrders?.length || 0) > 0;
                return (
                  <tr key={quotation.id}>
                    <td><strong>{quotation.quotationNumber}</strong></td>
                    <td>
                      <div>{quotation.customer?.name || `Customer #${quotation.customerId}`}</div>
                      {quotation.customer?.businessName && (
                        <small style={{ color: "#8a94a6" }}>{quotation.customer.businessName}</small>
                      )}
                    </td>
                    <td>₹{Number(quotation.subtotal).toFixed(2)}</td>
                    <td>₹{Number(quotation.totalDiscount).toFixed(2)}</td>
                    <td>₹{Number(quotation.totalGst).toFixed(2)}</td>
                    <td><strong>₹{Number(quotation.grandTotal).toFixed(2)}</strong></td>
                    <td><StatusPill status={quotation.status} /></td>
                    <td>{new Date(quotation.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="small-btn" onClick={() => setSelected(quotation)}>
                          View
                        </button>

                        {canManageSalesFlow(role) && quotation.status === "DRAFT" && (
                          <button className="small-btn" onClick={() => setStatus(quotation.id, "SENT")} disabled={busy}>
                            Send
                          </button>
                        )}

                        {canManageSalesFlow(role) && quotation.status === "SENT" && (
                          <>
                            <button className="small-btn" onClick={() => setStatus(quotation.id, "ACCEPTED")} disabled={busy}>
                              Accept
                            </button>
                            <button className="small-btn" onClick={() => setStatus(quotation.id, "REJECTED")} disabled={busy}>
                              Reject
                            </button>
                          </>
                        )}

                        {canManageSalesFlow(role) && quotation.status === "ACCEPTED" && !converted && (
                          <button className="btn-convert" onClick={() => convert(quotation.id)} disabled={busy}>
                            Convert to Sales Order
                          </button>
                        )}

                        {converted && (
                          <span style={{ fontSize: 12, color: "#16a34a" }}>
                            → {quotation.salesOrders?.[0]?.orderNumber}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleQuotations.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">No quotations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Quotation ${selected.quotationNumber}`} onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div>
              <strong>Customer</strong>
              <p>{selected.customer?.name || "-"}</p>
            </div>
            <div>
              <strong>Status</strong>
              <p><StatusPill status={selected.status} /></p>
            </div>
            <div>
              <strong>Subtotal</strong>
              <p>₹{Number(selected.subtotal).toFixed(2)}</p>
            </div>
            <div>
              <strong>Grand Total</strong>
              <p><strong>₹{Number(selected.grandTotal).toFixed(2)}</strong></p>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Disc %</th>
                  <th>GST %</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(selected.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td>{Number(item.discountPct)}%</td>
                    <td>{Number(item.gstPct)}%</td>
                    <td>₹{Number(item.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* SALES ORDERS */

function SalesOrders({ token, role }: { token: string; role: string }) {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/sales-orders?limit=100`, { headers });
      setSalesOrders(res.data?.data || []);
    } catch (error: any) {
      console.error("Sales order load failed:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const confirm = async (id: number) => {
    try {
      setBusy(id);
      await axios.post(`${API}/sales-orders/${id}/confirm`, {}, { headers });
      alert("Sales Order confirmed and inventory reserved");
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not confirm sales order");
    } finally {
      setBusy(null);
    }
  };

  const dispatch = async (id: number) => {
    if (!window.confirm("Dispatch this Sales Order? Physical and reserved stock will reduce.")) return;

    try {
      setBusy(id);
      await axios.post(`${API}/sales-orders/${id}/dispatch`, {}, { headers });
      alert("Sales Order dispatched successfully");
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not dispatch sales order");
    } finally {
      setBusy(null);
    }
  };

  const availableOf = (item: SalesOrderItem) => {
    const physical = Number(item.product?.currentStock ?? 0);
    const reserved = Number(item.product?.reservedQuantity ?? 0);
    return physical - reserved;
  };

  const statusCounts = {
    PENDING: salesOrders.filter((o) => o.status === "PENDING").length,
    CONFIRMED: salesOrders.filter((o) => o.status === "CONFIRMED").length,
    DISPATCHED: salesOrders.filter((o) => o.status === "DISPATCHED").length,
    CANCELLED: salesOrders.filter((o) => o.status === "CANCELLED").length,
  };

  const visibleOrders =
    statusFilter === "ALL"
      ? salesOrders
      : salesOrders.filter((o) => o.status === statusFilter);

  return (
    <section>
      <PageHeading
        title="Sales Orders"
        subtitle="Confirm to reserve inventory, then process dispatch"
      />

      <div className="summary-row">
        <SummaryCard label="All Orders" value={salesOrders.length} color="#111827" active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
        <SummaryCard label="Pending" value={statusCounts.PENDING} color="#d97706" active={statusFilter === "PENDING"} onClick={() => setStatusFilter("PENDING")} />
        <SummaryCard label="Confirmed" value={statusCounts.CONFIRMED} color="#0ea5e9" active={statusFilter === "CONFIRMED"} onClick={() => setStatusFilter("CONFIRMED")} />
        <SummaryCard label="Dispatched" value={statusCounts.DISPATCHED} color="#065f46" active={statusFilter === "DISPATCHED"} onClick={() => setStatusFilter("DISPATCHED")} />
        <SummaryCard label="Cancelled" value={statusCounts.CANCELLED} color="#dc2626" active={statusFilter === "CANCELLED"} onClick={() => setStatusFilter("CANCELLED")} />
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Order Processing</h3>
            <p>
              {statusFilter === "ALL"
                ? `${salesOrders.length} sales order records`
                : `${visibleOrders.length} of ${salesOrders.length} orders · ${statusFilter}`}
              {" "}· inventory availability shown per item
            </p>
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="empty">No sales orders found</div>
        ) : (
          visibleOrders.map((order) => {
            const short =
              order.status === "PENDING" &&
              (order.items || []).some((item) => availableOf(item) < item.quantity);

            return (
              <div className="order-card" key={order.id}>
                <div className="order-card-head">
                  <div>
                    <h3>
                      {order.orderNumber} <StatusPill status={order.status} />
                    </h3>
                    <div className="order-meta">
                      {order.customer?.name || `Customer #${order.customerId}`}
                      {order.customer?.businessName ? ` · ${order.customer.businessName}` : ""}
                      {" · "}Quotation {order.quotation?.quotationNumber || `#${order.quotationId}`}
                      {" · "}{new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="order-meta">Grand Total</div>
                      <div className="order-total">₹{Number(order.grandTotal).toFixed(2)}</div>
                    </div>

                    <div className="order-actions">
                      {canProcessOrders(role) && order.status === "PENDING" && (
                        <button className="btn-confirm" onClick={() => confirm(order.id)} disabled={busy === order.id}>
                          {busy === order.id ? "..." : "Confirm & Reserve"}
                        </button>
                      )}

                      {canProcessOrders(role) && order.status === "CONFIRMED" && (
                        <button className="btn-dispatch" onClick={() => dispatch(order.id)} disabled={busy === order.id}>
                          {busy === order.id ? "..." : "Dispatch"}
                        </button>
                      )}

                      {order.status === "DISPATCHED" && (
                        <span className="avail-chip dispatched">✓ Dispatched</span>
                      )}

                      {order.status === "CANCELLED" && (
                        <span className="avail-chip short">Cancelled</span>
                      )}

                      {!canProcessOrders(role) && order.status === "PENDING" && (
                        <span className="avail-chip reserved">Awaiting admin</span>
                      )}
                    </div>
                  </div>
                </div>

                {short && (
                  <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>
                    ⚠ Some items do not have enough available stock to confirm this order.
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Ordered</th>
                        <th>Physical Stock</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item) => {
                        const available = availableOf(item);
                        const enough = available >= item.quantity;
                        return (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.productName}</strong>
                              <div style={{ fontSize: 11, opacity: 0.7 }}>{item.sku}</div>
                            </td>
                            <td>{item.quantity}</td>
                            <td>{Number(item.product?.currentStock ?? 0)}</td>
                            <td>{Number(item.product?.reservedQuantity ?? 0)}</td>
                            <td>
                              <span className={`avail-chip ${enough ? "ok" : "short"}`}>{available}</span>
                            </td>
                            <td>₹{Number(item.lineTotal).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {order.dispatches && order.dispatches.length > 0 && (
                  <div className="order-meta" style={{ marginTop: 10 }}>
                    Dispatch: {order.dispatches.map((d) => d.dispatchNumber).join(", ")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* COMMON COMPONENTS */


function PageHeading({
  title,
  subtitle,
  button,
  onClick,
  showButton = true,
}: {
  title: string;
  subtitle: string;
  button?: string;
  onClick?: () => void;
  showButton?: boolean;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {button && showButton && (
        <button className="primary-btn" onClick={onClick}>
          {button}
        </button>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

export default App;