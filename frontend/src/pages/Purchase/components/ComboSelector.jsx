import axios from "axios";
import { useEffect } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { GiPopcorn } from "react-icons/gi";
import { useDispatch, useSelector } from "react-redux";
import HashLoader from "react-spinners/esm/HashLoader.js";
import { setComboQuantity } from "../../../reducers/cartSlice";

const formatVND = (value) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export const ComboSelector = ({
  comboData,
  setComboData,
  comboLoading,
  setComboLoading,
  paymentOngoing,
}) => {
  const dispatch = useDispatch();
  const { movie_id: movieId, combo_items: selectedCombos } = useSelector(
    (store) => store.cart
  );
  const { id: theatreId } = useSelector((store) => store.currentLocation);

  useEffect(() => {
    if (!movieId || !theatreId) return;

    const fetchCombos = async () => {
      try {
        setComboLoading(true);
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/movieCombos`,
          { movieId, theatreId }
        );
        setComboData(response.data);
      } catch (err) {
        console.error(err);
        setComboData({ movieId, theatreId, hasPromotion: false, combos: [] });
      } finally {
        setComboLoading(false);
      }
    };

    fetchCombos();
  }, [movieId, theatreId, setComboData, setComboLoading]);

  const quantityOf = (comboId) =>
    selectedCombos.find((item) => item.comboId === comboId)?.quantity || 0;

  return (
    <div className="combo-selector">
      <div className="form-item-heading">Chọn combo bắp nước</div>
      {comboLoading ? (
        <HashLoader color="#eb3656" size={36} />
      ) : (
        <>
          <p className={`combo-promotion-note ${comboData.hasPromotion ? "is-active" : ""}`}>
            {comboData.hasPromotion
              ? "Phim này đang có combo khuyến mãi. Giá ưu đãi đã được áp dụng tự động."
              : "Phim này chưa có khuyến mãi combo. Bạn vẫn có thể chọn combo giá thường."}
          </p>

          <div className="combo-grid">
            {(comboData.combos || []).map((combo) => {
              const quantity = quantityOf(combo.id);
              return (
                <article
                  className={`combo-card ${quantity > 0 ? "is-selected" : ""}`}
                  key={combo.id}
                >
                  <div className="combo-card-icon" aria-hidden="true">
                    <GiPopcorn />
                  </div>
                  <div className="combo-card-content">
                    <div className="combo-card-heading">
                      <h3>{combo.name}</h3>
                      {combo.is_promotional ? (
                        <span className="combo-discount-badge">
                          -{combo.discount_percent}%
                        </span>
                      ) : null}
                    </div>
                    <p>{combo.description}</p>
                    <div className="combo-price-row">
                      {combo.is_promotional ? (
                        <span className="combo-old-price">{formatVND(combo.base_price)}</span>
                      ) : null}
                      <strong>{formatVND(combo.final_price)}</strong>
                    </div>
                  </div>
                  <div className="combo-quantity" aria-label={`Số lượng ${combo.name}`}>
                    <button
                      type="button"
                      aria-label={`Giảm ${combo.name}`}
                      disabled={paymentOngoing || quantity === 0}
                      onClick={() =>
                        dispatch(setComboQuantity({ comboId: combo.id, quantity: quantity - 1 }))
                      }
                    >
                      <FiMinus aria-hidden="true" />
                    </button>
                    <strong>{quantity}</strong>
                    <button
                      type="button"
                      aria-label={`Thêm ${combo.name}`}
                      disabled={paymentOngoing || quantity >= 10}
                      onClick={() =>
                        dispatch(setComboQuantity({ comboId: combo.id, quantity: quantity + 1 }))
                      }
                    >
                      <FiPlus aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="combo-optional-note">Combo là tùy chọn, bạn có thể tiếp tục mà không cần chọn.</p>
        </>
      )}
    </div>
  );
};
