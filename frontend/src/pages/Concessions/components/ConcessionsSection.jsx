import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheckCircle, FiMapPin, FiMinus, FiPlus, FiShoppingBag } from "react-icons/fi";
import { GiPopcorn } from "react-icons/gi";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { showLoginModal } from "../../../reducers/authSlice";
import {
  concessionOrderCreated,
  concessionPurchaseCompletion,
  ticketPurchaseError,
} from "../../../toasts/toast";
import { API_URL } from "../../../utils/apiUrl";
import { RewardPointsSelector } from "../../../components/RewardPointsSelector";

const formatVND = (value) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export const ConcessionsSection = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const handledOrderRef = useRef("");
  const { isAuthenticated, signedPerson } = useSelector((store) => store.authentication);
  const [catalog, setCatalog] = useState({ theatres: [], categories: [], products: [] });
  const [theatreId, setTheatreId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("PayOS");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardDiscount, setRewardDiscount] = useState(0);
  const [rewardRefreshKey, setRewardRefreshKey] = useState(0);

  const loadCatalog = useCallback(async (selectedId = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/concessions/catalog`, {
        params: selectedId ? { theatreId: selectedId } : {},
      });
      setCatalog(response.data);
      setTheatreId(String(response.data.selectedTheatre?.id || ""));
    } catch (err) {
      ticketPurchaseError(err?.response?.data?.message || "Không thể tải danh mục bắp nước");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const selectedItems = useMemo(
    () => catalog.products
      .filter((product) => Number(quantities[product.id] || 0) > 0)
      .map((product) => ({ ...product, quantity: Number(quantities[product.id]) })),
    [catalog.products, quantities]
  );
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = selectedItems.reduce(
    (sum, item) => sum + Number(item.base_price) * item.quantity,
    0
  );
  const payableTotal = Math.max(0, total - rewardDiscount);
  const handleRewardChange = useCallback((points) => setRewardPoints(points), []);
  const handleRewardDiscount = useCallback((discount) => setRewardDiscount(discount), []);

  const updateQuantity = (productId, delta) => {
    setQuantities((current) => {
      const next = Math.min(10, Math.max(0, Number(current[productId] || 0) + delta));
      return { ...current, [productId]: next };
    });
  };

  const changeTheatre = async (event) => {
    const nextId = event.target.value;
    setQuantities({});
    setRewardPoints(0);
    setTheatreId(nextId);
    await loadCatalog(nextId);
  };

  const submitOrder = async () => {
    if (!isAuthenticated || signedPerson.person_type !== "Customer") {
      dispatch(showLoginModal());
      return;
    }
    if (!theatreId || selectedItems.length === 0) {
      ticketPurchaseError("Vui lòng chọn chi nhánh và ít nhất một sản phẩm");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        email: signedPerson.email,
        theatreId: Number(theatreId),
        items: selectedItems.map((item) => ({ comboId: item.id, quantity: item.quantity })),
        rewardPoints,
        customerPassword: signedPerson.password,
      };
      if (paymentMethod === "Thanh toán tại rạp") {
        const response = await axios.post(
          `${API_URL}/concessions/counter-orders/create`,
          payload
        );
        concessionOrderCreated(response.data.orderCode, response.data.expiresAt);
        setCompletedOrder({
          orderCode: response.data.orderCode,
          title: "Đã gửi đơn đến quầy",
          message: "Vui lòng đến đúng chi nhánh đã chọn để thanh toán và nhận bắp nước trong 30 phút.",
        });
        setQuantities({});
        setRewardPoints(0);
        setRewardRefreshKey((current) => current + 1);
        return;
      }

      const response = await axios.post(
        `${API_URL}/concessions/payos/create-payment-link`,
        payload
      );
      if (!response.data?.checkoutUrl) throw new Error("Thiếu đường dẫn thanh toán PayOS");
      window.location.href = response.data.checkoutUrl;
    } catch (err) {
      ticketPurchaseError(err?.response?.data?.message || err.message || "Không thể tạo đơn bắp nước");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderCode = params.get("payosOrderCode");
    if (!orderCode || handledOrderRef.current === orderCode) return;
    handledOrderRef.current = orderCode;

    const confirmOrder = async () => {
      if (params.get("payosCancel") === "1") {
        ticketPurchaseError("Bạn đã huỷ thanh toán PayOS");
        navigate("/bap-nuoc", { replace: true });
        return;
      }
      try {
        setSubmitting(true);
        await axios.post(`${API_URL}/payos/confirm-return`, { orderCode });
        concessionPurchaseCompletion(orderCode);
        setCompletedOrder({
          orderCode,
          title: "Thanh toán thành công",
          message: "Đơn bắp nước đã được ghi nhận. Bạn có thể nhận hàng tại chi nhánh đã chọn.",
        });
        setQuantities({});
        setRewardPoints(0);
        setRewardRefreshKey((current) => current + 1);
        navigate("/bap-nuoc", { replace: true });
      } catch (err) {
        ticketPurchaseError(err?.response?.data?.message || "Không thể xác nhận thanh toán PayOS");
      } finally {
        setSubmitting(false);
      }
    };
    confirmOrder();
  }, [location.search, navigate]);

  return (
    <main className="concession-page">
      <section className="concession-hero">
        <div className="container concession-hero-inner">
          <div>
            <p className="concession-kicker">CGV FOOD &amp; DRINK</p>
            <h1>Bắp giòn, phim hay, trọn vị tại rạp.</h1>
            <p>Đặt trước combo, nước uống và đồ ăn nhẹ. Chọn chi nhánh nhận hàng rồi thanh toán theo cách phù hợp với bạn.</p>
          </div>
          <div className="concession-hero-art" aria-hidden="true">
            <GiPopcorn />
            <span>ĐẶT TRƯỚC<br />NHẬN NHANH</span>
          </div>
        </div>
      </section>

      <section className="concession-shop container">
        <div className="concession-location-card">
          <div><FiMapPin /><span><small>NHẬN HÀNG TẠI</small><strong>Chọn rạp gần bạn</strong></span></div>
          <select value={theatreId} onChange={changeTheatre} disabled={loading || submitting}>
            {catalog.theatres.map((theatre) => (
              <option key={theatre.id} value={theatre.id}>{theatre.name} ({theatre.location})</option>
            ))}
          </select>
        </div>

        {completedOrder ? (
          <div className="concession-success" role="status">
            <FiCheckCircle />
            <div><h2>{completedOrder.title}</h2><p>{completedOrder.message}</p><strong>Mã đơn #{completedOrder.orderCode}</strong></div>
            <button type="button" onClick={() => setCompletedOrder(null)}>Mua thêm</button>
          </div>
        ) : null}

        {loading ? (
          <div className="concession-loading"><ClipLoader color="#eb3656" size={44} /><span>Đang tải thực đơn...</span></div>
        ) : catalog.products.length === 0 ? (
          <div className="concession-empty">Chi nhánh hiện chưa có sản phẩm đang bán.</div>
        ) : (
          <div className="concession-layout">
            <div className="concession-menu">
              {catalog.categories.map((category) => (
                <section className="concession-category" key={category}>
                  <div className="concession-category-heading"><span>{category}</span><i /></div>
                  <div className="concession-product-grid">
                    {catalog.products.filter((item) => item.category === category).map((product) => {
                      const quantity = Number(quantities[product.id] || 0);
                      return (
                        <article className={`concession-product ${quantity ? "is-selected" : ""}`} key={product.id}>
                          <div className="concession-product-image">
                            <img src={product.image_url || "/Images/features/food.webp"} alt={product.name} />
                          </div>
                          <div className="concession-product-body">
                            <div><h3>{product.name}</h3><p>{product.description}</p></div>
                            <strong>{formatVND(product.base_price)}</strong>
                            <div className="concession-quantity" aria-label={`Số lượng ${product.name}`}>
                              <button type="button" disabled={!quantity || submitting} onClick={() => updateQuantity(product.id, -1)} aria-label={`Giảm ${product.name}`}><FiMinus /></button>
                              <span>{quantity}</span>
                              <button type="button" disabled={quantity >= 10 || submitting} onClick={() => updateQuantity(product.id, 1)} aria-label={`Tăng ${product.name}`}><FiPlus /></button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <aside className="concession-cart">
              <div className="concession-cart-title"><FiShoppingBag /><div><small>GIỎ HÀNG</small><h2>{totalQuantity} sản phẩm</h2></div></div>
              <div className="concession-cart-lines">
                {selectedItems.length ? selectedItems.map((item) => (
                  <div className="concession-cart-line" key={item.id}>
                    <span>{item.quantity} × {item.name}</span><strong>{formatVND(item.base_price * item.quantity)}</strong>
                  </div>
                )) : <p>Chọn món yêu thích để bắt đầu đơn hàng.</p>}
              </div>
              <div className="concession-payment-options">
                <label className={paymentMethod === "PayOS" ? "is-active" : ""}><input type="radio" name="foodPayment" checked={paymentMethod === "PayOS"} onChange={() => setPaymentMethod("PayOS")} />Thanh toán online <small>Trong vòng 10 phút</small></label>
                <label className={paymentMethod === "Thanh toán tại rạp" ? "is-active" : ""}><input type="radio" name="foodPayment" checked={paymentMethod === "Thanh toán tại rạp"} onChange={() => setPaymentMethod("Thanh toán tại rạp")} />Thanh toán tại rạp <small>Nhận hàng trong 30 phút</small></label>
              </div>
              <RewardPointsSelector key={rewardRefreshKey} grossAmount={total} value={rewardPoints} onChange={handleRewardChange} onDiscountChange={handleRewardDiscount} disabled={submitting} compact />
              {rewardDiscount > 0 ? <div className="concession-reward-discount"><span>Điểm thưởng ({rewardPoints})</span><strong>-{formatVND(rewardDiscount)}</strong></div> : null}
              <div className="concession-cart-total"><span>Tổng thanh toán</span><strong>{formatVND(payableTotal)}</strong></div>
              <button className="concession-checkout" type="button" disabled={!totalQuantity || submitting} onClick={submitOrder}>
                {submitting ? <ClipLoader color="#fff" size={20} /> : isAuthenticated ? "Đặt bắp nước" : "Đăng nhập để mua"}
              </button>
              <p className="concession-cart-note">Giá và tình trạng sản phẩm được xác nhận lại tại backend khi tạo đơn.</p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
};
