import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";

const statusLabel = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  PENDING: "Đang chờ",
  FAILED: "Thất bại",
};

const statusClass = {
  PAID: "is-paid",
  UNPAID: "is-unpaid",
  PENDING: "is-pending",
  FAILED: "is-failed",
};

export const RecentOrders = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const password = signedPerson?.password;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email || !password) return;

    const fetchOrders = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminRecentOrders`,
          { email, password }
        );
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [email, password]);

  const formatVND = (val) => {
    if (!Number.isFinite(val)) return "0₫";
    return val.toLocaleString("vi-VN") + "₫";
  };

  if (loading) {
    return (
      <section className="admin-table-section">
        <div className="admin-section-heading">
          <p className="admin-section-kicker">Gần đây</p>
          <h3 className="form-admin-heading">Đơn đặt vé mới nhất</h3>
        </div>
        <div className="admin-chart-loading">Đang tải...</div>
      </section>
    );
  }

  return (
    <section className="admin-table-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Gần đây</p>
        <h3 className="form-admin-heading">Đơn đặt vé mới nhất</h3>
      </div>

      {orders.length === 0 ? (
        <p className="admin-empty-state">Chưa có đơn đặt vé nào.</p>
      ) : (
        <div className="admin-order-table">
          <div className="admin-order-row admin-order-row--head">
            <span>Mã đơn</span>
            <span>Khách hàng</span>
            <span>Phim</span>
            <span>Tiền</span>
            <span>Phương thức</span>
            <span>Trạng thái</span>
            <span>Ngày</span>
          </div>

          {orders.map((order) => (
            <div key={order.order_code} className="admin-order-row">
              <div>
                <span className="admin-order-mobile-label">Mã đơn</span>
                <strong>{order.order_code}</strong>
              </div>
              <div>
                <span className="admin-order-mobile-label">Khách hàng</span>
                <span>{order.customer_email}</span>
              </div>
              <div className="admin-order-main">
                <span className="admin-order-mobile-label">Phim</span>
                <strong>{order.movie_name || "—"}</strong>
              </div>
              <div>
                <span className="admin-order-mobile-label">Tiền</span>
                <span>{formatVND(order.amount)}</span>
              </div>
              <div>
                <span className="admin-order-mobile-label">Phương thức</span>
                <span>{order.payment_method || "—"}</span>
              </div>
              <div>
                <span className="admin-order-mobile-label">Trạng thái</span>
                <span className={`admin-order-status ${statusClass[order.status] || ""}`}>
                  {statusLabel[order.status] || order.status}
                </span>
              </div>
              <div>
                <span className="admin-order-mobile-label">Ngày</span>
                <small>{order.created_at ? new Date(order.created_at).toLocaleDateString("vi-VN") : "—"}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
