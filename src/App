import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const STATUS = {
  Assigned: "موجه للطيار",
  PickedUp: "تم الاستلام",
  Delivered: "تم التوصيل",
  CustomerRefused: "العميل رفض الاستلام",
  Cancelled: "ملغي",
};

const STATUS_STYLE = {
  Assigned: "bg-blue-100 text-blue-700 border-blue-200",
  PickedUp: "bg-amber-100 text-amber-700 border-amber-200",
  Delivered: "bg-green-100 text-green-700 border-green-200",
  CustomerRefused: "bg-orange-100 text-orange-700 border-orange-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

const DEFAULT_POINTS = {
  fastMinutes: 10,
  fastPoints: 2,
  normalMinutes: 20,
  normalPoints: 1,
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

function now() {
  return new Date().toISOString();
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
  return value ? `${value} دقيقة` : "—";
}

function calcPoints(order, settings) {
  const m = minutesNumber(order.pickedUpAt, order.deliveredAt);
  if (!m) return 0;
  if (m <= Number(settings.fastMinutes)) return Number(settings.fastPoints) || 0;
  if (m <= Number(settings.normalMinutes)) return Number(settings.normalPoints) || 0;
  return 0;
}

function dbUserToApp(row) {
  return {
    username: row.username,
    password: row.password,
    role: row.role,
    name: row.name,
    branch: row.branch,
    manualPoints: row.manual_points || 0,
  };
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
  return {
    fastMinutes: row.fast_minutes,
    fastPoints: row.fast_points,
    normalMinutes: row.normal_minutes,
    normalPoints: row.normal_points,
  };
}

function Logo({ small = false }) {
  return (
    <div className={`${small ? "h-12 w-12 text-sm" : "h-20 w-20 text-xl"} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-800 text-center font-black leading-none text-white shadow-lg`}>
      C<br />STORE
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState(readStore("cstore_rider_last_username", ""));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from("app_users")
      .select("*")
      .eq("username", username.trim())
      .eq("password", password)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }

    const user = dbUserToApp(data);

    if (user.role !== "Rider") {
      setError("هذا التطبيق مخصص للطيارين فقط");
      return;
    }

    saveStore("cstore_rider_last_username", user.username);
    saveStore("cstore_rider_login", user);
    onLogin(user);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-100 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-3 text-2xl font-black text-pink-700">C Store Rider</h1>
          <p className="text-slate-500">تسجيل دخول الطيار</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-xl border p-3 text-left"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            autoCapitalize="none"
          />

          <input
            className="w-full rounded-xl border p-3 text-left"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />

          {error && <p className="rounded-xl bg-red-50 p-3 text-center font-bold text-red-700">{error}</p>}

          <button disabled={loading} className="w-full rounded-xl bg-pink-600 p-3 font-bold text-white disabled:opacity-60">
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function OrderCard({ order, onPickUp, onDeliver, onRefuse }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">رقم الأوردر</p>
          <h3 className="text-2xl font-black text-slate-900">#{order.orderId}</h3>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLE[order.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
          {STATUS[order.status] || order.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
        <div>
          <p className="text-slate-500">الفرع</p>
          <p className="font-bold">{order.branch}</p>
        </div>
        <div>
          <p className="text-slate-500">التاريخ</p>
          <p className="font-bold">{formatDate(order.assignedAt)}</p>
        </div>
        <div>
          <p className="text-slate-500">وقت التوجيه</p>
          <p className="font-bold">{formatTime(order.assignedAt)}</p>
        </div>
        <div>
          <p className="text-slate-500">وقت الاستلام</p>
          <p className="font-bold">{formatTime(order.pickedUpAt)}</p>
        </div>
        <div>
          <p className="text-slate-500">وقت النهاية</p>
          <p className="font-bold">{formatTime(order.deliveredAt || order.refusedAt)}</p>
        </div>
        <div>
          <p className="text-slate-500">مدة التوصيل</p>
          <p className="font-bold">{minutesText(order.pickedUpAt, order.deliveredAt)}</p>
        </div>
      </div>

      {order.cancelReason && (
        <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
          {order.cancelReason}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2">
        {order.status === "Assigned" && (
          <button onClick={() => onPickUp(order)} className="rounded-2xl bg-amber-500 p-4 text-lg font-black text-white shadow">
            استلام الأوردر
          </button>
        )}

        {order.status === "PickedUp" && (
          <>
            <button onClick={() => onDeliver(order)} className="rounded-2xl bg-green-600 p-4 text-lg font-black text-white shadow">
              تم التوصيل
            </button>

            <button onClick={() => onRefuse(order)} className="rounded-2xl bg-orange-50 p-4 text-lg font-black text-orange-700">
              العميل رفض الاستلام
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => readStore("cstore_rider_login", null));
  const [orders, setOrders] = useState([]);
  const [pointsSettings, setPointsSettings] = useState(DEFAULT_POINTS);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");

  useEffect(() => {
    if (user) {
      loadData(user);
    }
  }, [user]);

  async function loadData(currentUser = user) {
    if (!currentUser) return;

    setLoading(true);
    setDbError("");

    const [ordersResult, pointsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("rider", currentUser.username)
        .order("created_at", { ascending: false }),
      supabase.from("point_settings").select("*").eq("id", 1).single(),
    ]);

    if (ordersResult.error || pointsResult.error) {
      console.error({ ordersResult, pointsResult });
      setDbError("في مشكلة في تحميل البيانات");
      setLoading(false);
      return;
    }

    setOrders((ordersResult.data || []).map(dbOrderToApp));
    setPointsSettings(pointsResult.data ? dbPointsToApp(pointsResult.data) : DEFAULT_POINTS);
    setLoading(false);
  }

  async function updateOrder(order, changes) {
    const updatedOrder = { ...order, ...changes };
    setOrders((list) => list.map((item) => (item.id === order.id ? updatedOrder : item)));

    const { error } = await supabase.from("orders").update(appOrderToDb(updatedOrder)).eq("id", order.id);

    if (error) {
      console.error(error);
      window.alert("حصلت مشكلة أثناء حفظ التعديل");
      loadData();
    }
  }

  function pickUp(order) {
    updateOrder(order, {
      status: "PickedUp",
      pickedUpAt: now(),
    });
  }

  function deliver(order) {
    const deliveredAt = now();
    const updatedOrder = { ...order, deliveredAt };

    updateOrder(order, {
      status: "Delivered",
      deliveredAt,
      points: calcPoints(updatedOrder, pointsSettings),
    });
  }

  function refuse(order) {
    updateOrder(order, {
      status: "CustomerRefused",
      refusedAt: now(),
      cancelReason: "رفض العميل الاستلام",
    });
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("cstore_rider_login");
  }

  const activeOrders = orders.filter((order) => ["Assigned", "PickedUp"].includes(order.status));
  const deliveredOrders = orders.filter((order) => order.status === "Delivered");
  const refusedOrders = orders.filter((order) => order.status === "CustomerRefused");
  const totalPoints = orders.reduce((sum, order) => sum + (order.points || 0), 0) + (user?.manualPoints || 0);

  const shownOrders = useMemo(() => {
    if (activeFilter === "active") return activeOrders;
    if (activeFilter === "delivered") return deliveredOrders;
    if (activeFilter === "refused") return refusedOrders;
    return orders;
  }, [activeFilter, orders]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-pink-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo small />
            <div>
              <h1 className="font-black text-pink-700">C Store Rider</h1>
              <p className="text-xs text-slate-500">{user.name} — {user.branch}</p>
            </div>
          </div>

          <button onClick={logout} className="rounded-xl border px-4 py-2 text-sm font-bold">
            خروج
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        <div className="rounded-3xl bg-gradient-to-br from-pink-600 to-pink-800 p-5 text-white shadow-lg">
          <p className="text-sm opacity-90">أهلا يا</p>
          <h2 className="text-2xl font-black">{user.name}</h2>
          <p className="mt-1 text-sm opacity-90">أوردراتك تظهر هنا مباشرة من الداش بورد</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="نشط" value={activeOrders.length} />
          <StatCard title="تم التوصيل" value={deliveredOrders.length} />
          <StatCard title="رفض العميل" value={refusedOrders.length} />
          <StatCard title="النقاط" value={totalPoints} />
        </div>

        {dbError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">
            {dbError}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 rounded-2xl border bg-white p-2 shadow-sm">
          <button onClick={() => setActiveFilter("active")} className={`rounded-xl p-2 text-sm font-bold ${activeFilter === "active" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>
            نشط
          </button>
          <button onClick={() => setActiveFilter("delivered")} className={`rounded-xl p-2 text-sm font-bold ${activeFilter === "delivered" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>
            تم
          </button>
          <button onClick={() => setActiveFilter("refused")} className={`rounded-xl p-2 text-sm font-bold ${activeFilter === "refused" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>
            رفض
          </button>
          <button onClick={() => setActiveFilter("all")} className={`rounded-xl p-2 text-sm font-bold ${activeFilter === "all" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>
            الكل
          </button>
        </div>

        <button onClick={() => loadData()} disabled={loading} className="w-full rounded-2xl border bg-white p-3 font-bold shadow-sm disabled:opacity-60">
          {loading ? "جاري التحديث..." : "تحديث الأوردرات"}
        </button>

        <div className="space-y-3">
          {!shownOrders.length ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-slate-500 shadow-sm">
              لا توجد أوردرات هنا
            </div>
          ) : (
            shownOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPickUp={pickUp}
                onDeliver={deliver}
                onRefuse={refuse}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
