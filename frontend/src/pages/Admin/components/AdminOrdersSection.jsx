import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiRefreshCw, FiShoppingBag } from "react-icons/fi";
import { useSelector } from "react-redux";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chưa thanh toán", value: "UNPAID" },
  { label: "Đã thanh toán", value: "PAID" },
  { label: "PayOS chờ", value: "PENDING" },
  { label: "Lỗi", value: "FAILED" },
  { label: "Hết hạn", value: "EXPIRED" },
  { label: "Cần đối soát", value: "PAID_REVIEW" },
];

const statusLabels = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  PENDING: "PayOS chờ",
  FAILED: "Lỗi",
  EXPIRED: "Hết hạn",
  PAID_REVIEW: "Cần đối soát",
};
const fulfillmentLabels = { PENDING: "Chờ chuẩn bị", PREPARING: "Đang chuẩn bị", READY: "Sẵn sàng giao", PICKED_UP: "Đã giao" };

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatShowtime = (order) => {
  const date = order.showtime_date
    ? new Date(`${order.showtime_date}T00:00:00`).toLocaleDateString("vi-VN")
    : "--";
  return `${date} - ${order.movie_start_time || "--"}`;
};

const formatRemaining = (expiresAt, now) => {
  const seconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now) / 1000)
  );
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

export const AdminOrdersSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [updatingOrderCode, setUpdatingOrderCode] = useState("");
  const [now, setNow] = useState(Date.now());

  const adminPayload = useMemo(
    () => ({
      email: signedPerson?.email,
    }),
    [signedPerson?.email]
  );

  const fetchOrders = useCallback(async () => {
    if (!adminPayload.email) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/adminOrders`,
        {
          ...adminPayload,
          status: statusFilter,
        }
      );
      setOrders(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [adminPayload, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleMarkPaid = async (orderCode) => {
    try {
      setUpdatingOrderCode(orderCode);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminOrderStatusUpdate`, {
        ...adminPayload,
        orderCode,
        status: "PAID",
      });
      adminShowninToast("Đã cập nhật đơn sang đã thanh toán");
      await fetchOrders();
    } catch (err) {
      adminErrorToast(
        err?.response?.data?.message || "Không thể cập nhật trạng thái đơn hàng"
      );
    } finally {
      setUpdatingOrderCode("");
    }
  };

  const handleFulfillment = async (orderCode, status) => {
    try {
      setUpdatingOrderCode(orderCode);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminOrderFulfillmentUpdate`, { orderCode, status });
      await fetchOrders();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể cập nhật bắp nước");
    } finally { setUpdatingOrderCode(""); }
  };

  const handleCheckIn = async (orderCode) => {
    try {
      setUpdatingOrderCode(orderCode);
      await axios.post(`${import.meta.env.VITE_API_URL}/adminTicketCheckIn`, { orderCode });
      adminShowninToast("Check-in vé thành công");
      await fetchOrders();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể check-in vé");
    } finally { setUpdatingOrderCode(""); }
  };

  return (
    <section className="section-admin-orders container">
      <div className="admin-movie-list-header">
        <div>
          <p className="admin-section-kicker">Thanh toán</p>
          <h2 className="form-admin-heading">
            <FiShoppingBag className="admin-heading-icon" aria-hidden="true" />
            Quản lý đơn hàng
          </h2>
        </div>

        <div className="admin-order-toolbar">
          <select
            className="admin-order-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn-admin admin-movie-refresh" onClick={fetchOrders}>
            <FiRefreshCw aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-movie-loading">
          <ClipLoader color="#eb3656" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <p className="admin-empty-state">Chưa có đơn hàng phù hợp.</p>
      ) : (
        <div className="admin-order-table">
          <div className="admin-order-row admin-order-row--head">
            <span>Mã đơn</span>
            <span>Khách hàng</span>
            <span>Phim / suất</span>
            <span>Ghế</span>
            <span>Thanh toán</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>

          {orders.map((order) => {
            const status = String(order.status || "").toUpperCase();
            const isConcessionOrder = order.order_type === "CONCESSION";
            const expiresAt = new Date(order.expires_at).getTime();
            const holdActive = Number.isFinite(expiresAt) && expiresAt > now;
            const canMarkPaid =
              status === "UNPAID" &&
              order.payment_method === "Thanh toán tại rạp" &&
              holdActive;
            const isUpdating = updatingOrderCode === order.order_code;
            const hasCombos = Boolean(order.combo_items?.length);
            const hasTickets = Boolean(order.ticket_ids?.length);
            const fulfillmentStatus = order.fulfillment_status || "PENDING";
            const nextFulfillment = fulfillmentStatus === "PENDING" ? "PREPARING" : fulfillmentStatus === "PREPARING" ? "READY" : fulfillmentStatus === "READY" ? "PICKED_UP" : null;

            return (
              <article className="admin-order-row" key={order.order_code}>
                <div className="admin-order-main">
                  <span className="admin-order-mobile-label">Mã đơn</span>
                  <strong>#{order.order_code}</strong>
                  <small>{formatDateTime(order.created_at)}</small>
                  {order.expires_at && status !== "PAID" ? (
                    <small>
                      {isConcessionOrder ? "Hạn nhận hàng" : "Hạn giữ ghế"}: {formatDateTime(order.expires_at)}
                      {holdActive ? ` · Còn ${formatRemaining(order.expires_at, now)}` : ""}
                    </small>
                  ) : null}
                </div>
                <div>
                  <span className="admin-order-mobile-label">Khách hàng</span>
                  <span>{order.customer_email}</span>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Phim / suất</span>
                  <strong>{isConcessionOrder ? "Đơn bắp nước" : order.movie_name || "--"}</strong>
                  <small>
                    {isConcessionOrder
                      ? `${order.theatre_name || "--"} · ${order.theatre_address || "--"}`
                      : `${order.hall_name || "--"} · ${formatShowtime(order)}`}
                  </small>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Ghế</span>
                  <span>{order.seat_names?.join(", ") || order.seats?.join(", ") || "--"}</span>
                  {order.combo_items?.length ? (
                    <small>
                      Combo: {order.combo_items
                        .map((combo) => `${combo.name} ×${combo.quantity}`)
                        .join(", ")}
                    </small>
                  ) : null}
                </div>
                <div>
                  <span className="admin-order-mobile-label">Thanh toán</span>
                  <strong>{formatCurrency(order.amount)}</strong>
                  <small>{order.payment_method}</small>
                  {order.reward_points_used > 0 ? (
                    <small>
                      Điểm: -{order.reward_points_used} · Giảm {formatCurrency(order.reward_discount)}
                    </small>
                  ) : null}
                </div>
                <div>
                  <span className="admin-order-mobile-label">Trạng thái</span>
                  <span className={`admin-order-status is-${status.toLowerCase()}`}>
                    {statusLabels[status] || status}
                  </span>
                  {status === "PAID" && hasCombos ? <small>{fulfillmentLabels[fulfillmentStatus] || fulfillmentStatus}</small> : null}
                </div>
                <div className="admin-order-actions">
                  {canMarkPaid ? (
                    <button
                      className="btn-admin"
                      onClick={() => handleMarkPaid(order.order_code)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ClipLoader color="#fff" size={16} />
                      ) : (
                        <>
                          <FiCheckCircle aria-hidden="true" />
                          Đã thanh toán
                        </>
                      )}
                    </button>
                  ) : status === "PAID" && (hasTickets || (hasCombos && nextFulfillment)) ? (
                    <div className="admin-inline-actions">
                      {hasTickets && !order.ticket_checked_in_at ? <button className="btn-admin" onClick={() => handleCheckIn(order.order_code)} disabled={isUpdating}>Check-in vé</button> : null}
                      {hasCombos && nextFulfillment ? <button className="btn-admin is-secondary" onClick={() => handleFulfillment(order.order_code, nextFulfillment)} disabled={isUpdating}>{fulfillmentLabels[nextFulfillment]}</button> : null}
                      {order.ticket_checked_in_at ? <small>Vé đã check-in</small> : null}
                    </div>
                  ) : (
                    <span className="admin-order-action-note">
                      {order.ticket_ids?.length
                        ? `Vé: ${order.ticket_ids.join(", ")}`
                        : "Không có thao tác"}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
