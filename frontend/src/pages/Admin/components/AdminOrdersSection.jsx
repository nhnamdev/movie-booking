import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiRefreshCw, FiShoppingBag } from "react-icons/fi";
import { useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chưa thanh toán", value: "UNPAID" },
  { label: "Đã thanh toán", value: "PAID" },
  { label: "PayOS chờ", value: "PENDING" },
  { label: "Lỗi", value: "FAILED" },
];

const statusLabels = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  PENDING: "PayOS chờ",
  FAILED: "Lỗi",
};

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

export const AdminOrdersSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [updatingOrderCode, setUpdatingOrderCode] = useState("");

  const adminPayload = useMemo(
    () => ({
      email: signedPerson?.email,
      password: signedPerson?.password,
    }),
    [signedPerson?.email, signedPerson?.password]
  );

  const fetchOrders = useCallback(async () => {
    if (!adminPayload.email || !adminPayload.password) return;

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
            const canMarkPaid = status === "UNPAID";
            const isUpdating = updatingOrderCode === order.order_code;

            return (
              <article className="admin-order-row" key={order.order_code}>
                <div className="admin-order-main">
                  <span className="admin-order-mobile-label">Mã đơn</span>
                  <strong>#{order.order_code}</strong>
                  <small>{formatDateTime(order.created_at)}</small>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Khách hàng</span>
                  <span>{order.customer_email}</span>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Phim / suất</span>
                  <strong>{order.movie_name || "--"}</strong>
                  <small>
                    {order.hall_name || "--"} · {formatShowtime(order)}
                  </small>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Ghế</span>
                  <span>{order.seats?.join(", ") || "--"}</span>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Thanh toán</span>
                  <strong>{formatCurrency(order.amount)}</strong>
                  <small>{order.payment_method}</small>
                </div>
                <div>
                  <span className="admin-order-mobile-label">Trạng thái</span>
                  <span className={`admin-order-status is-${status.toLowerCase()}`}>
                    {statusLabels[status] || status}
                  </span>
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
