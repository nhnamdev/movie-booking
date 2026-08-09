import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEdit3, FiPlus, FiSave, FiTrash2, FiUpload } from "react-icons/fi";
import { useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";

const emptyCombo = {
  comboId: "",
  name: "",
  description: "",
  category: "Combo bắp nước",
  imageUrl: "",
  basePrice: "",
  isActive: true,
};
const emptyPromotion = {
  movieId: "",
  comboId: "",
  discountPercent: "",
  promotionLabel: "Ưu đãi combo theo phim",
  startAt: "",
  endAt: "",
  isActive: true,
};
const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const AdminComboSection = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [data, setData] = useState({ combos: [], promotions: [], movies: [] });
  const [comboForm, setComboForm] = useState(emptyCombo);
  const [promotionForm, setPromotionForm] = useState(emptyPromotion);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);

  const credentials = useMemo(
    () => ({ email: signedPerson?.email, password: signedPerson?.password }),
    [signedPerson?.email, signedPerson?.password]
  );
  const apiPost = useCallback(
    (path, payload = {}) =>
      axios.post(`${import.meta.env.VITE_API_URL}/${path}`, { ...credentials, ...payload }),
    [credentials]
  );
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiPost("adminComboManagement");
      setData(response.data);
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể tải combo");
    } finally {
      setLoading(false);
    }
  }, [apiPost]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveCombo = async (event) => {
    event.preventDefault();
    try {
      let imageUrl = comboForm.imageUrl;
      if (imageFile) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("email", credentials.email || "");
        formData.append("password", credentials.password || "");
        const uploadResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminUploadImage`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        imageUrl = uploadResponse.data.url;
      }
      await apiPost("adminComboUpsert", { ...comboForm, imageUrl });
      setComboForm(emptyCombo);
      setImageFile(null);
      await loadData();
      adminShowninToast("Đã lưu combo");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu combo");
    } finally {
      setImageUploading(false);
    }
  };

  const savePromotion = async (event) => {
    event.preventDefault();
    try {
      await apiPost("adminComboPromotionUpsert", promotionForm);
      setPromotionForm(emptyPromotion);
      await loadData();
      adminShowninToast("Đã lưu khuyến mãi combo");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu khuyến mãi");
    }
  };

  const removePromotion = async (promotionId) => {
    if (!window.confirm("Xóa khuyến mãi này?")) return;
    try {
      await apiPost("adminComboPromotionDelete", { promotionId });
      await loadData();
    } catch (err) {
      adminErrorToast(err?.response?.data?.message);
    }
  };

  return (
    <section className="admin-management-section">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Ẩm thực</p>
        <h2 className="form-admin-heading">Combo bắp nước và khuyến mãi theo phim</h2>
      </div>

      <div className="admin-management-forms">
        <form className="admin-management-form" onSubmit={saveCombo}>
          <h3>{comboForm.comboId ? "Sửa combo" : "Thêm combo"}</h3>
          <input required placeholder="Tên combo" value={comboForm.name} onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })} />
          <textarea required placeholder="Thành phần combo" value={comboForm.description} onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })} />
          <input required placeholder="Nhóm sản phẩm, ví dụ: Combo gấu" value={comboForm.category} onChange={(e) => setComboForm({ ...comboForm, category: e.target.value })} />
          <input ref={imageInputRef} className="admin-combo-file-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <button className="admin-combo-upload" type="button" onClick={() => imageInputRef.current?.click()}>
            <FiUpload /> {imageFile ? imageFile.name : comboForm.imageUrl ? "Đổi ảnh sản phẩm" : "Tải ảnh sản phẩm"}
          </button>
          {comboForm.imageUrl || imageFile ? (
            <img
              className="admin-combo-preview"
              src={imageFile ? URL.createObjectURL(imageFile) : comboForm.imageUrl}
              alt="Xem trước sản phẩm"
            />
          ) : null}
          <input required type="number" min="0" step="1000" placeholder="Giá thường" value={comboForm.basePrice} onChange={(e) => setComboForm({ ...comboForm, basePrice: e.target.value })} />
          <label className="admin-check-row"><input type="checkbox" checked={comboForm.isActive} onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })} /> Đang bán</label>
          <button className="btn-admin" disabled={imageUploading}><FiSave /> {imageUploading ? "Đang tải ảnh..." : "Lưu combo"}</button>
        </form>

        <form className="admin-management-form" onSubmit={savePromotion}>
          <h3>Gán khuyến mãi cho phim</h3>
          <select required value={promotionForm.movieId} onChange={(e) => setPromotionForm({ ...promotionForm, movieId: e.target.value })}>
            <option value="">Chọn phim</option>
            {data.movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.name}</option>)}
          </select>
          <select required value={promotionForm.comboId} onChange={(e) => setPromotionForm({ ...promotionForm, comboId: e.target.value })}>
            <option value="">Chọn combo</option>
            {data.combos.map((combo) => <option key={combo.id} value={combo.id}>{combo.name}</option>)}
          </select>
          <input required type="number" min="0" max="100" step="0.5" placeholder="Phần trăm giảm" value={promotionForm.discountPercent} onChange={(e) => setPromotionForm({ ...promotionForm, discountPercent: e.target.value })} />
          <input required placeholder="Tên chương trình" value={promotionForm.promotionLabel} onChange={(e) => setPromotionForm({ ...promotionForm, promotionLabel: e.target.value })} />
          <div className="admin-form-split">
            <label>Bắt đầu<input type="datetime-local" value={promotionForm.startAt} onChange={(e) => setPromotionForm({ ...promotionForm, startAt: e.target.value })} /></label>
            <label>Kết thúc<input type="datetime-local" value={promotionForm.endAt} onChange={(e) => setPromotionForm({ ...promotionForm, endAt: e.target.value })} /></label>
          </div>
          <label className="admin-check-row"><input type="checkbox" checked={promotionForm.isActive} onChange={(e) => setPromotionForm({ ...promotionForm, isActive: e.target.checked })} /> Đang áp dụng</label>
          <button className="btn-admin"><FiPlus /> Lưu khuyến mãi</button>
        </form>
      </div>

      {loading ? <div className="admin-chart-loading"><ClipLoader color="#eb3656" /></div> : (
        <>
          <div className="admin-combo-grid">
            {data.combos.map((combo) => (
              <article className="admin-combo-card" key={combo.id}>
                <div className="admin-combo-card-image">
                  <img src={combo.image_url || "/Images/features/food.webp"} alt={combo.name} />
                </div>
                <div><h3>{combo.name}</h3><p>{combo.description}</p></div>
                <small>{combo.category}</small>
                <strong>{Number(combo.base_price).toLocaleString("vi-VN")}₫</strong>
                <span className={`admin-state-chip ${combo.is_active ? "is-active" : ""}`}>{combo.is_active ? "Đang bán" : "Đã tắt"}</span>
                <button onClick={() => {
                  setImageFile(null);
                  setComboForm({
                    comboId: combo.id,
                    name: combo.name,
                    description: combo.description,
                    category: combo.category || "Combo bắp nước",
                    imageUrl: combo.image_url || "",
                    basePrice: combo.base_price,
                    isActive: Boolean(combo.is_active),
                  });
                }}><FiEdit3 /> Sửa</button>
              </article>
            ))}
          </div>

          <div className="admin-promotion-list">
            <h3>Khuyến mãi theo phim</h3>
            {data.promotions.map((promotion) => (
              <div className="admin-promotion-row" key={promotion.id}>
                <div><strong>{promotion.movie_name}</strong><small>{promotion.combo_name} · Giảm {Number(promotion.discount_percent)}%</small></div>
                <div><small>{promotion.start_at ? toDateTimeInput(promotion.start_at).replace("T", " ") : "Không giới hạn"} → {promotion.end_at ? toDateTimeInput(promotion.end_at).replace("T", " ") : "Không giới hạn"}</small></div>
                <div className="admin-inline-actions">
                  <button onClick={() => setPromotionForm({ movieId: promotion.movie_id, comboId: promotion.combo_id, discountPercent: promotion.discount_percent, promotionLabel: promotion.promotion_label || "", startAt: toDateTimeInput(promotion.start_at), endAt: toDateTimeInput(promotion.end_at), isActive: Boolean(promotion.is_active) })}><FiEdit3 /></button>
                  <button onClick={() => removePromotion(promotion.id)}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
