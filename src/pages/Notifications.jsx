import { useEffect, useMemo, useState } from "react";
import {
  FiBell,
  FiFilter,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiTrash2,
} from "react-icons/fi";
import DashboardCard from "../components/dashboard/DashboardCard";
import { notificationService } from "../services/api";

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await notificationService.getUserNotifications());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
        return (
          text.includes(search.toLowerCase()) &&
          (filter === "all" ||
            (filter === "unread" ? !item.is_read : item.is_read))
        );
      }),
    [items, filter, search],
  );

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-secondary-50 px-4 py-6 dark:bg-dark-bg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Notifications</h1>
              <p className="mt-2 text-sm text-white/80 md:text-base">
                Review platform updates, reminders, and account activity.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await notificationService.markAllAsRead();
                setItems((current) =>
                  current.map((item) => ({ ...item, is_read: true })),
                );
              }}
              className="btn bg-white/20 text-white"
            >
              Mark all read
            </button>
          </div>
        </div>
        <DashboardCard
          title="Notification center"
          subtitle="Search, filter, and review updates"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-secondary-100 bg-secondary-50 px-3 py-3 dark:border-dark-border dark:bg-dark-card">
              <FiSearch className="text-secondary-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-secondary-100 bg-secondary-50 px-3 py-3 dark:border-dark-border dark:bg-dark-card">
              <FiFilter className="text-secondary-500" />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
              <button type="button" onClick={load} className="ml-3 underline">
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="mt-6 p-6 text-secondary-500">
              Loading notifications...
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-secondary-500">
                  No notifications found.
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start sm:justify-between ${!item.is_read ? "border-primary-200 bg-primary-50/40" : "border-secondary-100 dark:border-dark-border"}`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`rounded-full p-2 ${!item.is_read ? "bg-primary-500 text-white" : "bg-secondary-100 text-secondary-600"}`}
                      >
                        {!item.is_read ? (
                          <FiBell className="h-4 w-4" />
                        ) : (
                          <FiCheckCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {item.title || "Notification"}
                        </div>
                        <div className="mt-1 text-sm text-secondary-500">
                          {item.message || ""}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-secondary-500">
                          <FiClock />
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        disabled={item.is_read}
                        className="text-sm text-primary-600 disabled:opacity-40"
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        disabled
                        className="text-red-400 cursor-not-allowed"
                        title="Notification deletion is not supported"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

export default Notifications;
