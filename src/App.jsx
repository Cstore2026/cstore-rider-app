import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const BRANCHES = ["Maadi", "Heliopolis", "New Cairo1", "New Cairo5", "Nasr City", "October", "Abbas"];

const DEFAULT_USERS = [
  { username: "admin", password: "17512", role: "Admin", name: "Admin", branch: "All", manualPoints: 0 },
  { username: "viewer", password: "1234", role: "Viewer", name: "Viewer", branch: "All", manualPoints: 0 },
  { username: "maadi", password: "0000", role: "Branch", name: "فرع المعادي", branch: "Maadi", manualPoints: 0 },
  { username: "heliopolis", password: "0000", role: "Branch", name: "فرع مصر الجديدة", branch: "Heliopolis", manualPoints: 0 },
  { username: "newcairo1", password: "0000", role: "Branch", name: "فرع التجمع الاول", branch: "New Cairo1", manualPoints: 0 },
   { username: "newcairo5", password: "0000", role: "Branch", name: "فرع التجمع الخامس", branch: "New Cairo5", manualPoints: 0 },
   { username: "Abbas", password: "0000", role: "Branch", name: "فرع عباس", branch: "Abbas", manualPoints: 0 },
  { username: "ahmed", password: "1234", role: "Rider", name: "Ahmed Rider", branch: "Maadi", manualPoints: 0 },
  { username: "mohamed", password: "1234", role: "Rider", name: "Mohamed Rider", branch: "Maadi", manualPoints: 0 },
  { username: "youssef", password: "1234", role: "Rider", name: "Youssef Rider", branch: "Heliopolis", manualPoints: 0 },
];
const DEFAULT_POINTS = {
  fastMinutes: 10,
  fastPoints: 2,
  normalMinutes: 20,
  normalPoints: 1,
};
const STATUS = {
  Assigned: "موجه للطيار",
  PickedUp: "تم الاستلام",
  Delivered: "تم التوصيل",
  CustomerRefused: "العميل رفض الاستلام",
  Cancelled: "ملغي",
};

const STATUS_STYLE = {
  Assigned: "bg-blue-100 text-blue-700",
  PickedUp: "bg-amber-100 text-amber-700",
  Delivered: "bg-green-100 text-green-700",
  CustomerRefused: "bg-orange-100 text-orange-700",
  Cancelled: "bg-red-100 text-red-700",
};

const EMPTY_FILTERS = {
  search: "",
  month: "",
  fromDate: "",
  toDate: "",
  status: "All",
  branch: "All",
  rider: "All",
};

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}


function dbUserToApp(row) {
  return { username: row.username, password: row.password, role: row.role, name: row.name, branch: row.branch, manualPoints: row.manual_points || 0 };
}

function appUserToDb(user) {
  return { username: user.username, password: user.password, role: user.role, name: user.name, branch: user.branch, manual_points: Number(user.manualPoints) || 0 };
}

function dbOrderToApp(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    branch: row.branch,
    rider: row.rider,
    status: row.status,
    assignedAt: row.assigned_at,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
    refusedAt: row.refused_at,
    cancelReason: row.cancel_reason || "",
    points: row.points || 0,
    createdAt: row.created_at,
  };
}

function appOrderToDb(order) {
  return {
    id: order.id,
    order_id: order.orderId,
    branch: order.branch,
    rider: order.rider,
    status: order.status,
    assigned_at: order.assignedAt,
    picked_up_at: order.pickedUpAt,
    delivered_at: order.deliveredAt,
    refused_at: order.refusedAt,
    cancel_reason: order.cancelReason || "",
    points: Number(order.points) || 0,
    created_at: order.createdAt,
  };
}

function dbPointsToApp(row) {
  return { fastMinutes: row.fast_minutes, fastPoints: row.fast_points, normalMinutes: row.normal_minutes, normalPoints: row.normal_points };
}

function appPointsToDb(settings) {
  return {
    id: 1,
    fast_minutes: Number(settings.fastMinutes) || 10,
    fast_points: Number(settings.fastPoints) || 0,
    normal_minutes: Number(settings.normalMinutes) || 20,
    normal_points: Number(settings.normalPoints) || 0,
    updated_at: new Date().toISOString(),
  };
}

function now() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function minutesNumber(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
}

function minutesText(start, end) {
  const value = minutesNumber(start, end);
  return value ? `${value} min` : "—";
}

function calcPoints(order, pointsSettings) {
  const m = minutesNumber(order.pickedUpAt, order.deliveredAt);
  if (!m) return 0;
  if (m <= Number(pointsSettings.fastMinutes)) return Number(pointsSettings.fastPoints) || 0;
  if (m <= Number(pointsSettings.normalMinutes)) return Number(pointsSettings.normalPoints) || 0;
  return 0;
}

function exportCSV(orders, users) {
  const headers = [
    "Order ID",
    "Date",
    "Branch",
    "Rider",
    "Status",
    "Assigned",
    "Picked Up",
    "Delivered / Refused",
    "Duration",
    "Points",
    "Reason",
  ];

  const rows = orders.map((order) => {
    const riderName = users.find((user) => user.username === order.rider)?.name || order.rider;

    return [
      order.orderId,
      formatDate(order.assignedAt),
      order.branch,
      riderName,
      STATUS[order.status] || order.status,
      formatTime(order.assignedAt),
      formatTime(order.pickedUpAt),
      formatTime(order.deliveredAt || order.refusedAt),
      minutesText(order.pickedUpAt, order.deliveredAt),
      order.points || 0,
      order.cancelReason || "",
    ];
  });

  const lineBreak = String.fromCharCode(10);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join(lineBreak);

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cstore-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function roleOrders(orders, user) {
  if (!user) return [];
  if (user.role === "Rider") return orders.filter((order) => order.rider === user.username);
  if (user.role === "Branch") return orders.filter((order) => order.branch === user.branch);
  return orders;
}

function applyFilters(orders, users, filters) {
  return orders.filter((order) => {
    const riderName = users.find((user) => user.username === order.rider)?.name || order.rider;
    const text = [order.orderId, order.branch, riderName, STATUS[order.status] || order.status].join(" ").toLowerCase();
    const query = filters.search.trim().toLowerCase();
    const date = new Date(order.assignedAt || order.createdAt);

    if (query && !text.includes(query)) return false;
    if (filters.status !== "All" && order.status !== filters.status) return false;
    if (filters.branch !== "All" && order.branch !== filters.branch) return false;
    if (filters.rider !== "All" && order.rider !== filters.rider) return false;

    if (filters.month) {
      const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (orderMonth !== filters.month) return false;
    }

    if (filters.fromDate && date < new Date(`${filters.fromDate}T00:00:00`)) return false;
    if (filters.toDate && date > new Date(`${filters.toDate}T23:59:59`)) return false;

    return true;
  });
}

function Logo({ big = false }) {
  return (
    <div className={`${big ? "h-20 w-20 text-xl" : "h-12 w-12 text-sm"} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-800 text-center font-black leading-none text-white shadow-lg`}>
      C<br />STORE
    </div>
  );
}

function Login({ users, onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();

    const user = users.find(
      (account) => account.username.toLowerCase() === username.toLowerCase() && account.password === password
    );

    if (!user) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }

    setError("");
    onLogin(user);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-100 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <Logo big />
          <div>
            <h1 className="text-2xl font-black text-pink-700">C Store Delivery</h1>
            <p className="text-slate-500">Dashboard Login</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-xl border p-3"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
          />

          <input
            className="w-full rounded-xl border p-3"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />

          {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

          <button className="w-full rounded-xl bg-pink-600 p-3 font-bold text-white">
            دخول
          </button>
        </form>

       
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="font-black text-pink-700">C Store Delivery</h1>
            <p className="text-xs text-slate-500">
              {user.name} — {user.role} {user.branch !== "All" ? `— ${user.branch}` : ""}
            </p>
          </div>
        </div>

        <button onClick={onLogout} className="rounded-xl border px-4 py-2 font-bold">
          خروج
        </button>
      </div>
    </header>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xl">{icon}</div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function Tab({ id, label, active, setActive }) {
  return (
    <button
      onClick={() => setActive(id)}
      className={`rounded-xl px-4 py-2 font-bold ${active === id ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </button>
  );
}

function Dashboard({ orders }) {
  const delivered = orders.filter((order) => order.status === "Delivered");
  const activeOrders = orders.filter((order) => ["Assigned", "PickedUp"].includes(order.status));
  const refused = orders.filter((order) => order.status === "CustomerRefused");
  const points = orders.reduce((sum, order) => sum + (order.points || 0), 0);
  const avg = delivered.length
    ? Math.round(delivered.reduce((sum, order) => sum + minutesNumber(order.pickedUpAt, order.deliveredAt), 0) / delivered.length)
    : "—";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <Card title="إجمالي الأوردرات" value={orders.length} icon="📦" />
      <Card title="نشط" value={activeOrders.length} icon="⏱️" />
      <Card title="تم التوصيل" value={delivered.length} icon="✅" />
      <Card title="رفض العميل" value={refused.length} icon="⚠️" />
      <Card title="متوسط التوصيل" value={avg === "—" ? "—" : `${avg} min`} icon="🏍️" />
      <Card title="النقاط" value={points} icon="🏆" />
    </div>
  );
}

function Filters({ filters, setFilters, users, user }) {
  const branches = user.role === "Branch" ? [user.branch] : BRANCHES;
  const riders = users.filter((account) => account.role === "Rider" && (user.role !== "Branch" || account.branch === user.branch));

  function update(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-black">فلاتر البحث</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="rounded-xl border p-3"
          placeholder="بحث برقم الأوردر أو الطيار"
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
        />

        <input className="rounded-xl border p-3" type="month" value={filters.month} onChange={(event) => update("month", event.target.value)} />
        <input className="rounded-xl border p-3" type="date" value={filters.fromDate} onChange={(event) => update("fromDate", event.target.value)} />
        <input className="rounded-xl border p-3" type="date" value={filters.toDate} onChange={(event) => update("toDate", event.target.value)} />

        <select className="rounded-xl border p-3" value={filters.status} onChange={(event) => update("status", event.target.value)}>
          <option value="All">كل الحالات</option>
          {Object.entries(STATUS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select className="rounded-xl border p-3" value={filters.branch} onChange={(event) => update("branch", event.target.value)} disabled={user.role === "Branch"}>
          <option value="All">كل الفروع</option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>

        <select className="rounded-xl border p-3" value={filters.rider} onChange={(event) => update("rider", event.target.value)}>
          <option value="All">كل الطيارين</option>
          {riders.map((rider) => (
            <option key={rider.username} value={rider.username}>{rider.name}</option>
          ))}
        </select>

        <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="rounded-xl border p-3 font-bold">
          مسح الفلاتر
        </button>
      </div>
    </div>
  );
}

function OrderForm({ user, users, onAdd }) {
  const branches = user.role === "Admin" ? BRANCHES : [user.branch];
  const [orderId, setOrderId] = useState("");
  const [branch, setBranch] = useState(branches[0]);
  const riders = users.filter((account) => account.role === "Rider" && account.branch === branch);
  const [rider, setRider] = useState("");

  useEffect(() => {
    if (!riders.some((item) => item.username === rider)) {
      setRider(riders[0]?.username || "");
    }
  }, [branch, users.length]);

  function submit(event) {
    event.preventDefault();

    if (!orderId || !rider) return;

    const createdAt = now();

    onAdd({
      id: uid(),
      orderId,
      branch,
      rider,
      status: "Assigned",
      assignedAt: createdAt,
      pickedUpAt: null,
      deliveredAt: null,
      refusedAt: null,
      cancelReason: "",
      points: 0,
      createdAt,
    });

    setOrderId("");
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-black">إضافة أوردر</h2>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          className="rounded-xl border p-3"
          placeholder="رقم الأوردر"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        />

        <select className="rounded-xl border p-3" value={branch} onChange={(event) => setBranch(event.target.value)} disabled={user.role === "Branch"}>
          {branches.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select className="rounded-xl border p-3" value={rider} onChange={(event) => setRider(event.target.value)}>
          {riders.map((item) => (
            <option key={item.username} value={item.username}>{item.name}</option>
          ))}
        </select>

        <button className="rounded-xl bg-pink-600 p-3 font-bold text-white md:col-span-3">
          إرسال للطيار
        </button>
      </form>
    </div>
  );
}

function OrdersTable({ orders, users, currentUser, updateOrder, reassignOrder }) {
  function pickUp(id) {
    updateOrder(id, { status: "PickedUp", pickedUpAt: now() });
  }

  function deliver(order) {
    const deliveredAt = now();
    updateOrder(order.id, {
      status: "Delivered",
      deliveredAt,
      points: calcPoints({ ...order, deliveredAt }, currentUser.pointsSettings || DEFAULT_POINTS),
    });
  }

  function refuse(id) {
    updateOrder(id, {
      status: "CustomerRefused",
      refusedAt: now(),
      cancelReason: "رفض العميل الاستلام",
    });
  }

  function cancel(id) {
    updateOrder(id, {
      status: "Cancelled",
      cancelReason: "تم الإلغاء",
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-black">كل الأوردرات</h2>
          <p className="text-sm text-slate-500">{orders.length} أوردر</p>
        </div>

        {["Admin", "Branch"].includes(currentUser.role) && (
          <button onClick={() => exportCSV(orders, users)} className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">
            تحميل Excel
          </button>
        )}
      </div>

      {!orders.length ? (
        <div className="p-8 text-center text-slate-500">لا توجد أوردرات</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-right">Order</th>
                <th className="p-3 text-right">Date</th>
                <th className="p-3 text-right">Branch</th>
                <th className="p-3 text-right">Rider</th>
                <th className="p-3 text-right">Status</th>
                <th className="p-3 text-right">Assigned</th>
                <th className="p-3 text-right">Picked</th>
                <th className="p-3 text-right">Done</th>
                <th className="p-3 text-right">Duration</th>
                <th className="p-3 text-right">Points</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const riderName = users.find((user) => user.username === order.rider)?.name || order.rider;

                return (
                  <tr key={order.id} className="border-t align-top">
                    <td className="p-3 font-bold">#{order.orderId}</td>
                    <td className="p-3">{formatDate(order.assignedAt)}</td>
                    <td className="p-3">{order.branch}</td>
                    <td className="p-3">{riderName}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[order.status] || "bg-slate-100 text-slate-700"}`}>
                        {STATUS[order.status]}
                      </span>
                      {order.cancelReason && <p className="mt-1 text-xs text-slate-500">{order.cancelReason}</p>}
                    </td>
                    <td className="p-3">{formatTime(order.assignedAt)}</td>
                    <td className="p-3">{formatTime(order.pickedUpAt)}</td>
                    <td className="p-3">{formatTime(order.deliveredAt || order.refusedAt)}</td>
                    <td className="p-3">{minutesText(order.pickedUpAt, order.deliveredAt)}</td>
                    <td className="p-3 font-bold">{order.points || 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {["Rider", "Admin"].includes(currentUser.role) && order.status === "Assigned" && (
                          <button onClick={() => pickUp(order.id)} className="rounded bg-amber-500 px-3 py-2 font-bold text-white">
                            استلام
                          </button>
                        )}

                        {["Rider", "Admin"].includes(currentUser.role) && order.status === "PickedUp" && (
                          <>
                            <button onClick={() => deliver(order)} className="rounded bg-green-600 px-3 py-2 font-bold text-white">
                              تم التوصيل
                            </button>
                            <button onClick={() => refuse(order.id)} className="rounded bg-orange-50 px-3 py-2 font-bold text-orange-700">
                              رفض
                            </button>
                          </>
                        )}

                        {["Admin", "Branch"].includes(currentUser.role) && order.status === "Assigned" && (
                          <button onClick={() => reassignOrder(order.id)} className="rounded bg-pink-50 px-3 py-2 font-bold text-pink-700">
                            تغيير الطيار
                          </button>
                        )}

                        {["Admin", "Branch"].includes(currentUser.role) && !["Delivered", "CustomerRefused", "Cancelled"].includes(order.status) && (
                          <button onClick={() => cancel(order.id)} className="rounded bg-red-50 px-3 py-2 font-bold text-red-700">
                            إلغاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RidersPerformance({ orders, users, currentUser, saveUsers }) {
  const riders = users.filter((user) => user.role === "Rider" && (currentUser.role !== "Branch" || user.branch === currentUser.branch));

  function adjust(username, value) {
    if (currentUser.role !== "Admin") return;
    saveUsers(users.map((user) => user.username === username ? { ...user, manualPoints: (user.manualPoints || 0) + value } : user));
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <h2 className="font-black">أداء الطيارين</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-right">الطيار</th>
              <th className="p-3 text-right">الفرع</th>
              <th className="p-3 text-right">الأوردرات</th>
              <th className="p-3 text-right">تم التوصيل</th>
              <th className="p-3 text-right">النقاط</th>
              {currentUser.role === "Admin" && <th className="p-3 text-right">تعديل</th>}
            </tr>
          </thead>

          <tbody>
            {riders.map((rider) => {
              const riderOrders = orders.filter((order) => order.rider === rider.username);
              const points = riderOrders.reduce((sum, order) => sum + (order.points || 0), 0) + (rider.manualPoints || 0);

              return (
                <tr key={rider.username} className="border-t">
                  <td className="p-3 font-bold">{rider.name}</td>
                  <td className="p-3">{rider.branch}</td>
                  <td className="p-3">{riderOrders.length}</td>
                  <td className="p-3">{riderOrders.filter((order) => order.status === "Delivered").length}</td>
                  <td className="p-3 font-black">{points}</td>
                  {currentUser.role === "Admin" && (
                    <td className="p-3">
                      <button onClick={() => adjust(rider.username, 1)} className="rounded bg-green-50 px-3 py-1 font-bold text-green-700">
                        +1
                      </button>
                      <button onClick={() => adjust(rider.username, -1)} className="mr-2 rounded bg-red-50 px-3 py-1 font-bold text-red-700">
                        -1
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersManager({ users, saveUsers, deleteUserFromDatabase }) {
  const emptyForm = {
    name: "",
    username: "",
    password: "1234",
    role: "Rider",
    branch: "Maadi",
    manualPoints: 0,
  };

  const [form, setForm] = useState(emptyForm);
  const [editingUsername, setEditingUsername] = useState(null);

  function resetForm() {
    setForm(emptyForm);
    setEditingUsername(null);
  }

  function submit(event) {
    event.preventDefault();

    if (!form.name || !form.username || !form.password) {
      window.alert("كمل الاسم واليوزر والباسورد");
      return;
    }

    const usernameExists = users.some(
      (user) => user.username === form.username && user.username !== editingUsername
    );

    if (usernameExists) {
      window.alert("اليوزر موجود قبل كده");
      return;
    }

    if (editingUsername) {
      saveUsers(
        users.map((user) =>
          user.username === editingUsername
            ? {
                ...user,
                name: form.name,
                username: form.username,
                password: form.password,
                role: form.role,
                branch: form.role === "Admin" || form.role === "Viewer" ? "All" : form.branch,
                manualPoints: Number(form.manualPoints) || 0,
              }
            : user
        )
      );

      resetForm();
      return;
    }

    saveUsers([
      ...users,
      {
        ...form,
        branch: form.role === "Admin" || form.role === "Viewer" ? "All" : form.branch,
        manualPoints: Number(form.manualPoints) || 0,
      },
    ]);

    resetForm();
  }

  function editUser(user) {
    setEditingUsername(user.username);
    setForm({
      name: user.name || "",
      username: user.username || "",
      password: user.password || "",
      role: user.role || "Rider",
      branch: user.branch || "Maadi",
      manualPoints: user.manualPoints || 0,
    });
  }

  async function deleteUser(username) {
    if (username === "admin") {
      window.alert("مينفعش تمسح حساب الأدمن الأساسي");
      return;
    }

    const ok = window.confirm("متأكد إنك عاوز تمسح الحساب ده؟");
    if (!ok) return;

    const deleted = await deleteUserFromDatabase(username);
    if (!deleted) return;

    saveUsers(users.filter((user) => user.username !== username));

    if (editingUsername === username) {
      resetForm();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-black">
          {editingUsername ? "تعديل حساب" : "إضافة حساب"}
        </h2>

        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="rounded-xl border p-3"
            placeholder="الاسم"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Username"
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />

          <select
            className="rounded-xl border p-3"
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({ ...current, role: event.target.value }))
            }
          >
            <option value="Admin">Admin</option>
            <option value="Viewer">Viewer</option>
            <option value="Branch">Branch</option>
            <option value="Rider">Rider</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.branch}
            onChange={(event) =>
              setForm((current) => ({ ...current, branch: event.target.value }))
            }
            disabled={form.role === "Admin" || form.role === "Viewer"}
          >
            {BRANCHES.map((branch) => (
              <option key={branch}>{branch}</option>
            ))}
          </select>

          <button className="rounded-xl bg-pink-600 p-3 font-bold text-white md:col-span-4">
            {editingUsername ? "حفظ التعديل" : "إضافة"}
          </button>

          {editingUsername && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border p-3 font-bold"
            >
              إلغاء
            </button>
          )}
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-black">كل الحسابات</h2>
          <p className="text-sm text-slate-500">{users.length} حساب</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">Username</th>
                <th className="p-3 text-right">Password</th>
                <th className="p-3 text-right">الدور</th>
                <th className="p-3 text-right">الفرع</th>
                <th className="p-3 text-right">نقط يدوية</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-t">
                  <td className="p-3 font-bold">{user.name}</td>
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.password}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">{user.branch}</td>
                  <td className="p-3">{user.manualPoints || 0}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editUser(user)}
                        className="rounded bg-blue-50 px-3 py-2 font-bold text-blue-700"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(user.username)}
                        className="rounded bg-red-50 px-3 py-2 font-bold text-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function PointsSettings({ settings, savePointsSettings }) {
  const [form, setForm] = useState(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();

    savePointsSettings({
      fastMinutes: Number(form.fastMinutes) || 10,
      fastPoints: Number(form.fastPoints) || 0,
      normalMinutes: Number(form.normalMinutes) || 20,
      normalPoints: Number(form.normalPoints) || 0,
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-black">إعدادات النقط</h2>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-600">دقائق التوصيل السريع</label>
          <input
            className="w-full rounded-xl border p-3"
            type="number"
            min="1"
            value={form.fastMinutes}
            onChange={(event) => update("fastMinutes", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-600">نقط التوصيل السريع</label>
          <input
            className="w-full rounded-xl border p-3"
            type="number"
            min="0"
            value={form.fastPoints}
            onChange={(event) => update("fastPoints", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-600">دقائق التوصيل العادي</label>
          <input
            className="w-full rounded-xl border p-3"
            type="number"
            min="1"
            value={form.normalMinutes}
            onChange={(event) => update("normalMinutes", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-600">نقط التوصيل العادي</label>
          <input
            className="w-full rounded-xl border p-3"
            type="number"
            min="0"
            value={form.normalPoints}
            onChange={(event) => update("normalPoints", event.target.value)}
          />
        </div>

        <button className="rounded-xl bg-pink-600 p-3 font-bold text-white md:col-span-4">
          حفظ إعدادات النقط
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [orders, setOrders] = useState([]);
  const [pointsSettings, setPointsSettings] = useState(DEFAULT_POINTS);
  const [loginUser, setLoginUser] = useState(() => readStore("cstore_login_live", null));
  const [active, setActive] = useState("orders");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    loadFromDatabase();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("cstore-dashboard-live-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = dbOrderToApp(payload.new);
            setOrders((list) => [newOrder, ...list.filter((order) => order.id !== newOrder.id)]);
          }

          if (payload.eventType === "UPDATE") {
            const updatedOrder = dbOrderToApp(payload.new);
            setOrders((list) => list.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
          }

          if (payload.eventType === "DELETE") {
            setOrders((list) => list.filter((order) => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadFromDatabase() {
    setLoading(true);
    setDbError("");

    const [usersResult, ordersResult, pointsResult] = await Promise.all([
      supabase.from("app_users").select("*").order("id", { ascending: true }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("point_settings").select("*").eq("id", 1).single(),
    ]);

    if (usersResult.error || ordersResult.error || pointsResult.error) {
      console.error({ usersResult, ordersResult, pointsResult });
      setDbError("في مشكلة في الاتصال بالداتا بيز");
      setLoading(false);
      return;
    }

    setUsers((usersResult.data || []).map(dbUserToApp));
    setOrders((ordersResult.data || []).map(dbOrderToApp));
    setPointsSettings(pointsResult.data ? dbPointsToApp(pointsResult.data) : DEFAULT_POINTS);
    setLoading(false);
  }

  const currentUser = loginUser
    ? users.find((user) => user.username === loginUser.username) || loginUser
    : null;

  const visibleOrders = roleOrders(orders, currentUser);
  const filteredOrders = currentUser?.role === "Rider"
    ? visibleOrders
    : applyFilters(visibleOrders, users, filters);

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-pink-50 p-4">
        <div className="rounded-3xl border bg-white p-6 text-center shadow-lg">
          <Logo big />
          <p className="mt-4 font-black text-pink-700">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-pink-50 p-4">
        <div className="max-w-md rounded-3xl border bg-white p-6 text-center shadow-lg">
          <p className="font-black text-red-700">{dbError}</p>
          <button onClick={loadFromDatabase} className="mt-4 rounded-xl bg-pink-600 px-4 py-2 font-bold text-white">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  function login(user) {
    setLoginUser(user);
    saveStore("cstore_login_live", user);
  }

  function logout() {
    setLoginUser(null);
    localStorage.removeItem("cstore_login_live");
  }

  if (!currentUser) return <Login users={users} onLogin={login} />;

  async function addOrder(order) {
    setOrders((list) => [order, ...list]);
    setActive("orders");

    const { error } = await supabase.from("orders").insert(appOrderToDb(order));
    if (error) {
      console.error(error);
      window.alert("الأوردر اتضاف على الشاشة بس فشل الحفظ في الداتا بيز");
    }
  }

  async function updateOrder(id, changes) {
    const oldOrder = orders.find((order) => order.id === id);
    if (!oldOrder) return;

    const updatedOrder = { ...oldOrder, ...changes };
    setOrders((list) => list.map((order) => (order.id === id ? updatedOrder : order)));

    const { error } = await supabase.from("orders").update(appOrderToDb(updatedOrder)).eq("id", id);
    if (error) {
      console.error(error);
      window.alert("حصلت مشكلة أثناء حفظ تعديل الأوردر");
    }
  }

  async function saveUsers(nextUsers) {
    setUsers(nextUsers);

    const { error } = await supabase
      .from("app_users")
      .upsert(nextUsers.map(appUserToDb), { onConflict: "username" });

    if (error) {
      console.error(error);
      window.alert("حصلت مشكلة أثناء حفظ الحسابات");
    }
  }

  async function savePointsSettings(nextSettings) {
    setPointsSettings(nextSettings);

    const { error } = await supabase
      .from("point_settings")
      .upsert(appPointsToDb(nextSettings), { onConflict: "id" });

    if (error) {
      console.error(error);
      window.alert("حصلت مشكلة أثناء حفظ إعدادات النقط");
      return;
    }

    window.alert("تم حفظ إعدادات النقط");
  }

  async function deleteUserFromDatabase(username) {
    const { error } = await supabase.from("app_users").delete().eq("username", username);
    if (error) {
      console.error(error);
      window.alert("حصلت مشكلة أثناء حذف الحساب من الداتا بيز");
      return false;
    }
    return true;
  }

  function reassignOrder(id) {
    const order = orders.find((item) => item.id === id);
    if (!order || order.status !== "Assigned") return;

    const riders = users.filter((user) => user.role === "Rider" && user.branch === order.branch);
    const line = String.fromCharCode(10);
    const options = riders.map((rider) => `${rider.username} - ${rider.name}`).join(line);
    const selected = window.prompt(`اكتب Username الطيار الجديد:${line}${options}`);

    const rider = riders.find((item) => item.username === selected?.trim());

    if (!rider) {
      window.alert("اختار طيار من نفس الفرع");
      return;
    }

    updateOrder(id, { rider: rider.username, assignedAt: now() });
  }

  const adminTabs = [
    ["dashboard", "نظرة عامة"],
    ["add", "إضافة أوردر"],
    ["orders", "كل الأوردرات"],
    ["riders", "أداء الطيارين"],
    ["points", "إعدادات النقط"],
    ["users", "الحسابات"],
  ];

  const branchTabs = [
    ["add", "إضافة أوردر"],
    ["orders", "كل الأوردرات"],
    ["riders", "أداء الطيارين"],
  ];

  const tabs = currentUser.role === "Admin" ? adminTabs : branchTabs;

  return (
    <div dir="rtl" className="min-h-screen bg-pink-50 text-slate-900">
      <Header user={currentUser} onLogout={logout} />

      <main className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">لوحة التحكم</h2>
            <p className="text-slate-500">نسخة ويب ثابتة جاهزة للرفع</p>
          </div>

         
        </div>

        <Dashboard orders={filteredOrders} />

        {["Admin", "Branch"].includes(currentUser.role) && (
          <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3 shadow-sm">
            {tabs.map(([id, label]) => (
              <Tab key={id} id={id} label={label} active={active} setActive={setActive} />
            ))}
          </div>
        )}

        {currentUser.role !== "Rider" && (
          <Filters filters={filters} setFilters={setFilters} users={users} user={currentUser} />
        )}

        {active === "add" && ["Admin", "Branch"].includes(currentUser.role) && (
          <OrderForm user={currentUser} users={users} onAdd={addOrder} />
        )}

        {active === "riders" && ["Admin", "Branch"].includes(currentUser.role) && (
          <RidersPerformance orders={filteredOrders} users={users} currentUser={currentUser} saveUsers={saveUsers} />
        )}

        {active === "points" && currentUser.role === "Admin" && (
          <PointsSettings settings={pointsSettings} savePointsSettings={savePointsSettings} />
        )}

        {active === "users" && currentUser.role === "Admin" && (
          <UsersManager users={users} saveUsers={saveUsers} deleteUserFromDatabase={deleteUserFromDatabase} />
        )}

        {(active === "orders" || currentUser.role === "Rider" || currentUser.role === "Viewer") && (
       <OrdersTable
            orders={filteredOrders}
            users={users}
            currentUser={{ ...currentUser, pointsSettings }}
            updateOrder={updateOrder}
            reassignOrder={reassignOrder}
          />
        )}
      </main>
    </div>
  );
}
