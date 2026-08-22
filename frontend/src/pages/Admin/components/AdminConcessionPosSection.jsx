import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiMapPin,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTrash2,
  FiUser,
  FiX,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import { GiPopcorn } from "react-icons/gi";
import { useSelector } from "react-redux";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";
import { API_URL } from "../../../utils/apiUrl";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

const formatVND = (value) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export const AdminConcessionPosSection = ({ onNavigateToOrders }) => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [catalog, setCatalog] = useState({ theatres: [], categories: [], products: [] });
  const [theatreId, setTheatreId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [payosModal, setPayosModal] = useState(null);

  const loadCatalog = useCallback(async (selectedId = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/concessions/catalog`, {
        params: selectedId ? { theatreId: selectedId } : {},
      });
      setCatalog(response.data);
      if (!theatreId || selectedId) {
        setTheatreId(String(response.data.selectedTheatre?.id || ""));
      }
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải danh mục bắp nước");
    } finally {
      setLoading(false);
    }
  }, [theatreId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const selectedItems = useMemo(
    () =>
      catalog.products
        .filter((product) => Number(quantities[product.id] || 0) > 0)
        .map((product) => ({ ...product, quantity: Number(quantities[product.id]) })),
    [catalog.products, quantities]
  );

  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + Number(item.base_price) * item.quantity,
    0
  );

  const filteredProducts = useMemo(() => {
    return catalog.products.filter((product) => {
      const matchCategory =
        selectedCategory === "ALL" || (product.category || "Combo bắp nước") === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [catalog.products, selectedCategory, searchQuery]);

  const updateQuantity = (productId, delta) => {
    setQuantities((current) => {
      const next = Math.max(0, Number(current[productId] || 0) + delta);
      if (next === 0) {
        const copy = { ...current };
        delete copy[productId];
        return copy;
      }
      return { ...current, [productId]: next };
    });
  };

  const clearCart = () => {
    setQuantities({});
    setCustomerEmail("");
  };

  const handleTheatreChange = async (e) => {
    const nextId = e.target.value;
    setQuantities({});
    setTheatreId(nextId);
    await loadCatalog(nextId);
  };

  const handleCashPayment = async () => {
    if (!theatreId || selectedItems.length === 0) {
      adminErrorToast("Vui lòng chọn ít nhất một sản phẩm bắp nước");
      return;
    }

    try {
      setSubmitting(true);
      const email = customerEmail.trim() || `khachle_${Date.now()}@pos.cgv.vn`;
      const response = await axios.post(
        `${API_URL}/concessions/counter-orders/create`,
        {
          email,
          theatreId: Number(theatreId),
          items: selectedItems.map((item) => ({
            comboId: item.id,
            quantity: item.quantity,
          })),
          directPaid: true,
        },
        { withCredentials: true }
      );

      adminShowninToast("Tạo đơn và thanh toán tiền mặt thành công!");
      setCompletedOrder({
        orderCode: response.data.orderCode,
        amount: totalAmount,
        theatreName: catalog.selectedTheatre?.name || "Rạp CGV",
        items: [...selectedItems],
        customerEmail: customerEmail.trim() || "Khách lẻ tại quầy",
        paymentMethod: "Tiền mặt tại quầy",
        status: "Đã thanh toán (Sẵn sàng chuẩn bị)",
      });
      clearCart();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tạo đơn bắp nước");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOSPayment = async () => {
    if (!theatreId || selectedItems.length === 0) {
      adminErrorToast("Vui lòng chọn ít nhất một sản phẩm bắp nước");
      return;
    }

    try {
      setSubmitting(true);
      const email = customerEmail.trim() || `khachle_${Date.now()}@pos.cgv.vn`;
      const response = await axios.post(
        `${API_URL}/concessions/payos/create-payment-link`,
        {
          email,
          theatreId: Number(theatreId),
          items: selectedItems.map((item) => ({
            comboId: item.id,
            quantity: item.quantity,
          })),
        },
        { withCredentials: true }
      );

      if (response.data.checkoutUrl) {
        setPayosModal({
          orderCode: response.data.orderCode,
          checkoutUrl: response.data.checkoutUrl,
          amount: totalAmount,
          theatreName: catalog.selectedTheatre?.name || "Rạp CGV",
        });
      }
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tạo link thanh toán PayOS");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section-admin-pos container">
      {/* Header */}
      <div className="admin-movie-list-header">
        <div>
          <p className="admin-section-kicker">Quầy dịch vụ (POS)</p>
          <h2 className="form-admin-heading">
            <GiPopcorn className="admin-heading-icon" aria-hidden="true" />
            Bán bắp nước tại quầy
          </h2>
        </div>

        <div className="admin-pos-top-controls">
          <div className="admin-pos-theatre-select">
            <FiMapPin aria-hidden="true" />
            <select value={theatreId} onChange={handleTheatreChange}>
              {catalog.theatres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.location})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-admin admin-movie-refresh"
            onClick={() => loadCatalog(theatreId)}
            title="Tải lại danh mục"
          >
            <FiRefreshCw aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Main POS Layout */}
      <div className="admin-pos-layout">
        {/* Left: Product Catalog */}
        <div className="admin-pos-catalog-panel">
          {/* Search & Category Filter */}
          <div className="admin-pos-filters">
            <div className="admin-pos-search-bar">
              <FiSearch aria-hidden="true" />
              <input
                type="text"
                placeholder="Tìm combo, bắp, nước, snack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="admin-pos-clear-search"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="admin-pos-category-tags">
              <button
                type="button"
                className={`admin-pos-category-btn ${selectedCategory === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ALL")}
              >
                Tất cả ({catalog.products.length})
              </button>
              {catalog.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`admin-pos-category-btn ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="admin-pos-loading">
              <ClipLoader color="#eb3656" size={36} />
              <p>Đang tải danh mục sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="admin-empty-state">
              <GiPopcorn size={48} style={{ opacity: 0.4, marginBottom: "1rem" }} />
              <p>Không tìm thấy sản phẩm bắp nước nào phù hợp.</p>
            </div>
          ) : (
            <div className="admin-pos-grid">
              {filteredProducts.map((product) => {
                const qty = Number(quantities[product.id] || 0);
                const imageUrl = resolveMediaUrl(product.image_url) || "/Images/features/food.webp";

                return (
                  <article
                    key={product.id}
                    className={`admin-pos-card ${qty > 0 ? "is-selected" : ""}`}
                    onClick={() => updateQuantity(product.id, 1)}
                  >
                    <div className="admin-pos-card-media">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/Images/features/food.webp";
                        }}
                      />
                      {qty > 0 && <span className="admin-pos-card-badge">{qty}</span>}
                    </div>

                    <div className="admin-pos-card-info">
                      <span className="admin-pos-card-cat">{product.category || "Combo"}</span>
                      <h4 className="admin-pos-card-title">{product.name}</h4>
                      {product.description && (
                        <p className="admin-pos-card-desc">{product.description}</p>
                      )}
                      <div className="admin-pos-card-foot">
                        <strong className="admin-pos-card-price">
                          {formatVND(product.base_price)}
                        </strong>

                        <div
                          className="admin-pos-card-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {qty > 0 ? (
                            <div className="admin-pos-qty-group">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, -1)}
                                title="Giảm số lượng"
                              >
                                <FiMinus />
                              </button>
                              <span>{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, 1)}
                                title="Tăng số lượng"
                              >
                                <FiPlus />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="admin-pos-add-btn"
                              onClick={() => updateQuantity(product.id, 1)}
                            >
                              <FiPlus /> Thêm
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: POS Cart & Order Summary */}
        <div className="admin-pos-cart-panel">
          <div className="admin-pos-cart-header">
            <div className="admin-pos-cart-title">
              <FiShoppingBag aria-hidden="true" />
              <h3>Đơn hàng quầy</h3>
            </div>
            <span className="admin-pos-cart-count">{totalQuantity} món</span>
          </div>

          {/* Cart Item List */}
          <div className="admin-pos-cart-items">
            {selectedItems.length === 0 ? (
              <div className="admin-pos-cart-empty">
                <GiPopcorn size={40} style={{ opacity: 0.3 }} />
                <p>Chưa có món nào trong giỏ hàng</p>
                <small>Nhấp vào sản phẩm bên trái để thêm vào đơn</small>
              </div>
            ) : (
              selectedItems.map((item) => (
                <div className="admin-pos-cart-row" key={item.id}>
                  <div className="admin-pos-cart-row-main">
                    <strong>{item.name}</strong>
                    <small>{formatVND(item.base_price)} / phần</small>
                  </div>

                  <div className="admin-pos-cart-row-controls">
                    <div className="admin-pos-qty-group">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <FiMinus />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <FiPlus />
                      </button>
                    </div>

                    <strong className="admin-pos-cart-row-total">
                      {formatVND(Number(item.base_price) * item.quantity)}
                    </strong>

                    <button
                      type="button"
                      className="admin-pos-cart-remove"
                      onClick={() => updateQuantity(item.id, -item.quantity)}
                      title="Xóa món"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Info Form */}
          <div className="admin-pos-customer-box">
            <label className="admin-pos-customer-label">
              <FiUser aria-hidden="true" />
              <span>Khách hàng (Tùy chọn)</span>
            </label>
            <div className="admin-pos-customer-input-wrap">
              <input
                type="text"
                placeholder="Nhập email thành viên CGV (để tích điểm)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              {customerEmail && (
                <button
                  type="button"
                  className="admin-pos-btn-ghost"
                  onClick={() => setCustomerEmail("")}
                >
                  Khách lẻ
                </button>
              )}
            </div>
            <small className="admin-pos-help-text">
              Để trống nếu là khách vãng lai mua lẻ tại quầy.
            </small>
          </div>

          {/* Order Summary & Actions */}
          <div className="admin-pos-checkout-box">
            <div className="admin-pos-summary-row">
              <span>Tạm tính ({totalQuantity} món):</span>
              <span>{formatVND(totalAmount)}</span>
            </div>
            <div className="admin-pos-summary-row total">
              <span>Tổng thanh toán:</span>
              <strong>{formatVND(totalAmount)}</strong>
            </div>

            <div className="admin-pos-actions">
              <button
                type="button"
                className="admin-pos-btn-cash"
                disabled={submitting || selectedItems.length === 0}
                onClick={handleCashPayment}
              >
                {submitting ? (
                  <ClipLoader size={18} color="#fff" />
                ) : (
                  <>
                    <FiDollarSign aria-hidden="true" />
                    <span>Thu tiền mặt (Hoàn tất ngay)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="admin-pos-btn-payos"
                disabled={submitting || selectedItems.length === 0}
                onClick={handlePayOSPayment}
              >
                <FiCreditCard aria-hidden="true" />
                <span>Tạo QR PayOS</span>
              </button>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  className="admin-pos-btn-clear"
                  onClick={clearCart}
                  disabled={submitting}
                >
                  <FiTrash2 aria-hidden="true" />
                  Xóa giỏ hàng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Cash Order Modal */}
      {completedOrder && (
        <div className="admin-pos-modal-overlay">
          <div className="admin-pos-modal">
            <div className="admin-pos-modal-icon success">
              <FiCheckCircle size={48} />
            </div>
            <h3>Bán bắp nước thành công!</h3>
            <p className="admin-pos-modal-code">
              Mã đơn: <strong>#{completedOrder.orderCode}</strong>
            </p>

            <div className="admin-pos-modal-details">
              <div className="admin-pos-modal-row">
                <span>Rạp nhận hàng:</span>
                <strong>{completedOrder.theatreName}</strong>
              </div>
              <div className="admin-pos-modal-row">
                <span>Khách hàng:</span>
                <span>{completedOrder.customerEmail}</span>
              </div>
              <div className="admin-pos-modal-row">
                <span>Hình thức:</span>
                <span>{completedOrder.paymentMethod}</span>
              </div>
              <div className="admin-pos-modal-row">
                <span>Trạng thái đơn:</span>
                <span className="admin-state-chip is-paid">Đang chuẩn bị (PAID)</span>
              </div>
              <hr />
              <div className="admin-pos-modal-items">
                {completedOrder.items.map((it) => (
                  <div className="admin-pos-modal-item" key={it.id}>
                    <span>
                      {it.name} ×{it.quantity}
                    </span>
                    <strong>{formatVND(Number(it.base_price) * it.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="admin-pos-modal-row total">
                <span>Tổng tiền đã thu:</span>
                <strong>{formatVND(completedOrder.amount)}</strong>
              </div>
            </div>

            <div className="admin-pos-modal-actions">
              <button
                type="button"
                className="btn-admin admin-btn-primary"
                onClick={() => setCompletedOrder(null)}
              >
                Bán đơn tiếp theo
              </button>
              {typeof onNavigateToOrders === "function" && (
                <button
                  type="button"
                  className="btn-admin admin-btn-secondary"
                  onClick={() => {
                    setCompletedOrder(null);
                    onNavigateToOrders();
                  }}
                >
                  Xem danh sách đơn hàng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PayOS QR Modal */}
      {payosModal && (
        <div className="admin-pos-modal-overlay">
          <div className="admin-pos-modal">
            <div className="admin-pos-modal-header">
              <h3>Thanh toán PayOS qua QR</h3>
              <button
                type="button"
                className="admin-pos-modal-close"
                onClick={() => setPayosModal(null)}
              >
                <FiX />
              </button>
            </div>
            <p className="admin-pos-modal-code">
              Mã đơn: <strong>#{payosModal.orderCode}</strong> ·{" "}
              {formatVND(payosModal.amount)}
            </p>
            <p style={{ color: "#a0a4b8", fontSize: "1.3rem", marginBottom: "1.5rem" }}>
              Hướng dẫn khách hàng dùng ứng dụng ngân hàng hoặc ví điện tử quét mã QR bên dưới để thanh toán:
            </p>

            <div className="admin-pos-qr-box">
              <iframe
                title="PayOS Checkout"
                src={payosModal.checkoutUrl}
                className="admin-pos-qr-iframe"
              />
            </div>

            <div className="admin-pos-modal-actions">
              <a
                href={payosModal.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-admin admin-btn-primary"
              >
                Mở link thanh toán PayOS
              </a>
              <button
                type="button"
                className="btn-admin admin-btn-secondary"
                onClick={() => {
                  setPayosModal(null);
                  clearCart();
                  if (typeof onNavigateToOrders === "function") {
                    onNavigateToOrders();
                  }
                }}
              >
                Đóng & Chuyển sang Đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
