import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEdit3, FiPlus, FiSave, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { adminErrorToast, adminShowninToast } from "../../../toasts/toast";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

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
const emptyBranchCombo = { theatreId: "", comboId: "", priceOverride: "", isAvailable: true };
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
  const [branchComboForm, setBranchComboForm] = useState(emptyBranchCombo);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const imageInputRef = useRef(null);
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile]
  );

  const credentials = useMemo(
    () => ({ email: signedPerson?.email }),
    [signedPerson?.email]
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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!activeForm) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving && !imageUploading) {
        setActiveForm(null);
        setComboForm(emptyCombo);
        setPromotionForm(emptyPromotion);
        setBranchComboForm(emptyBranchCombo);
        setImageFile(null);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeForm, imageUploading, saving]);

  const openComboForm = (combo = emptyCombo) => {
    setImageFile(null);
    setComboForm(combo);
    setActiveForm("combo");
  };

  const openPromotionForm = (promotion = emptyPromotion) => {
    setPromotionForm(promotion);
    setActiveForm("promotion");
  };

  const closeManagementForm = () => {
    if (saving || imageUploading) return;
    setActiveForm(null);
    setComboForm(emptyCombo);
    setPromotionForm(emptyPromotion);
    setBranchComboForm(emptyBranchCombo);
    setImageFile(null);
  };

  const saveCombo = async (event) => {
    event.preventDefault();
    let uploadedImageUrl = "";
    let comboSaved = false;
    try {
      setSaving(true);
      let imageUrl = comboForm.imageUrl;
      if (imageFile) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("email", credentials.email || "");
        formData.append("folder", "combos");
        const uploadResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminUploadImage`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        imageUrl = uploadResponse.data.url;
        uploadedImageUrl = imageUrl;
      }
      await apiPost("adminComboUpsert", { ...comboForm, imageUrl });
      comboSaved = true;
      setComboForm(emptyCombo);
      setImageFile(null);
      setActiveForm(null);
      await loadData();
      adminShowninToast("Đã lưu combo");
    } catch (err) {
      if (uploadedImageUrl && !comboSaved) {
        await apiPost("adminMediaDelete", { mediaUrl: uploadedImageUrl }).catch(() => {});
      }
      adminErrorToast(err?.response?.data?.message || "Không thể lưu combo");
    } finally {
      setImageUploading(false);
      setSaving(false);
    }
  };

  const savePromotion = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiPost("adminComboPromotionUpsert", promotionForm);
      setPromotionForm(emptyPromotion);
      setActiveForm(null);
      await loadData();
      adminShowninToast("Đã lưu khuyến mãi combo");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu khuyến mãi");
    } finally {
      setSaving(false);
    }
  };

  const saveBranchCombo = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiPost("adminBranchComboUpsert", branchComboForm);
      setBranchComboForm(emptyBranchCombo);
      setActiveForm(null);
      await loadData();
      adminShowninToast("Đã lưu trạng thái bán theo chi nhánh");
    } catch (err) {
      adminErrorToast(err?.response?.data?.message || "Không thể lưu combo theo chi nhánh");
    } finally {
      setSaving(false);
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

      <div className="admin-management-create-actions">
        <button type="button" className="btn-admin" onClick={() => openComboForm()}><FiPlus /> Thêm combo</button>
        <button type="button" className="btn-admin is-secondary" onClick={() => openPromotionForm()}><FiPlus /> Thêm khuyến mãi</button>
        <button type="button" className="btn-admin is-secondary" onClick={() => setActiveForm("branchCombo")}><FiPlus /> Combo theo chi nhánh</button>
      </div>

      {loading ? <div className="admin-chart-loading"><ClipLoader color="#eb3656" /></div> : (
        <>
          <div className="admin-combo-grid">
            {data.combos.map((combo) => (
              <article className="admin-combo-card" key={combo.id}>
                <div className="admin-combo-card-image">
                  <img src={resolveMediaUrl(combo.image_url) || "/Images/features/food.webp"} alt={combo.name} />
                </div>
                <div><h3>{combo.name}</h3><p>{combo.description}</p></div>
                <small>{combo.category}</small>
                <strong>{Number(combo.base_price).toLocaleString("vi-VN")}₫</strong>
                <span className={`admin-state-chip ${combo.is_active ? "is-active" : ""}`}>{combo.is_active ? "Đang bán" : "Đã tắt"}</span>
                <button onClick={() => {
                  openComboForm({
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
                  <button onClick={() => openPromotionForm({ movieId: promotion.movie_id, comboId: promotion.combo_id, discountPercent: promotion.discount_percent, promotionLabel: promotion.promotion_label || "", startAt: toDateTimeInput(promotion.start_at), endAt: toDateTimeInput(promotion.end_at), isActive: Boolean(promotion.is_active) })}><FiEdit3 /></button>
                  <button onClick={() => removePromotion(promotion.id)}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="admin-promotion-list">
            <h3>Phân phối theo chi nhánh</h3>
            {(data.branchCombos || []).map((item) => (
              <div className="admin-promotion-row" key={`${item.theatre_id}-${item.combo_id}`}>
                <div><strong>{item.theatre_name}</strong><small>{item.combo_name}</small></div>
                <div><small>{item.price_override == null ? "Dùng giá chung" : `${Number(item.price_override).toLocaleString("vi-VN")}₫`} - {item.is_available ? "Đang bán" : "Tạm hết"}</small></div>
                <div className="admin-inline-actions"><button type="button" onClick={() => { setBranchComboForm({ theatreId: item.theatre_id, comboId: item.combo_id, priceOverride: item.price_override ?? "", isAvailable: Boolean(item.is_available) }); setActiveForm("branchCombo"); }}><FiEdit3 /></button></div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeForm ? (
        <div
          className="admin-management-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeManagementForm();
          }}
        >
          {activeForm === "combo" ? (
            <form className="admin-management-form admin-management-modal-card" onSubmit={saveCombo} role="dialog" aria-modal="true" aria-labelledby="admin-combo-form-title">
              <div className="admin-management-modal-header">
                <div><p className="admin-section-kicker">Bắp nước</p><h3 id="admin-combo-form-title">{comboForm.comboId ? "Sửa combo" : "Thêm combo"}</h3></div>
                <button type="button" className="admin-modal-close" onClick={closeManagementForm} aria-label="Đóng cửa sổ"><FiX /></button>
              </div>
              <label className="admin-management-field">Tên combo<input autoFocus required placeholder="Ví dụ: Combo Couple" value={comboForm.name} onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })} /></label>
              <label className="admin-management-field">Thành phần<textarea required placeholder="Mô tả bắp, nước và số lượng" value={comboForm.description} onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })} /></label>
              <label className="admin-management-field">Nhóm sản phẩm<input required placeholder="Ví dụ: Combo gấu" value={comboForm.category} onChange={(e) => setComboForm({ ...comboForm, category: e.target.value })} /></label>
              <input ref={imageInputRef} className="admin-combo-file-input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <button className="admin-combo-upload" type="button" onClick={() => imageInputRef.current?.click()}><FiUpload /> {imageFile ? imageFile.name : comboForm.imageUrl ? "Đổi ảnh sản phẩm" : "Tải ảnh sản phẩm"}</button>
              {comboForm.imageUrl || imagePreviewUrl ? <img className="admin-combo-preview" src={imagePreviewUrl || resolveMediaUrl(comboForm.imageUrl)} alt="Xem trước sản phẩm" /> : null}
              <label className="admin-management-field">Giá thường<input required type="number" min="0" step="1000" placeholder="Nhập giá bán" value={comboForm.basePrice} onChange={(e) => setComboForm({ ...comboForm, basePrice: e.target.value })} /></label>
              <label className="admin-check-row"><input type="checkbox" checked={comboForm.isActive} onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })} /> Đang bán</label>
              <div className="admin-management-modal-actions">
                <button type="button" className="btn-admin is-secondary" onClick={closeManagementForm} disabled={saving || imageUploading}>Hủy</button>
                <button className="btn-admin" disabled={saving || imageUploading}><FiSave /> {imageUploading ? "Đang tải ảnh..." : saving ? "Đang lưu..." : "Lưu combo"}</button>
              </div>
            </form>
          ) : activeForm === "promotion" ? (
            <form className="admin-management-form admin-management-modal-card" onSubmit={savePromotion} role="dialog" aria-modal="true" aria-labelledby="admin-promotion-form-title">
              <div className="admin-management-modal-header">
                <div><p className="admin-section-kicker">Khuyến mãi</p><h3 id="admin-promotion-form-title">Gán khuyến mãi cho phim</h3></div>
                <button type="button" className="admin-modal-close" onClick={closeManagementForm} aria-label="Đóng cửa sổ"><FiX /></button>
              </div>
              <label className="admin-management-field">Phim<select autoFocus required value={promotionForm.movieId} onChange={(e) => setPromotionForm({ ...promotionForm, movieId: e.target.value })}><option value="">Chọn phim</option>{data.movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.name}</option>)}</select></label>
              <label className="admin-management-field">Combo<select required value={promotionForm.comboId} onChange={(e) => setPromotionForm({ ...promotionForm, comboId: e.target.value })}><option value="">Chọn combo</option>{data.combos.map((combo) => <option key={combo.id} value={combo.id}>{combo.name}</option>)}</select></label>
              <label className="admin-management-field">Phần trăm giảm<input required type="number" min="0" max="100" step="0.5" placeholder="Ví dụ: 15" value={promotionForm.discountPercent} onChange={(e) => setPromotionForm({ ...promotionForm, discountPercent: e.target.value })} /></label>
              <label className="admin-management-field">Tên chương trình<input required placeholder="Tên hiển thị với khách hàng" value={promotionForm.promotionLabel} onChange={(e) => setPromotionForm({ ...promotionForm, promotionLabel: e.target.value })} /></label>
              <div className="admin-form-split">
                <label>Bắt đầu<input type="datetime-local" value={promotionForm.startAt} onChange={(e) => setPromotionForm({ ...promotionForm, startAt: e.target.value })} /></label>
                <label>Kết thúc<input type="datetime-local" value={promotionForm.endAt} onChange={(e) => setPromotionForm({ ...promotionForm, endAt: e.target.value })} /></label>
              </div>
              <label className="admin-check-row"><input type="checkbox" checked={promotionForm.isActive} onChange={(e) => setPromotionForm({ ...promotionForm, isActive: e.target.checked })} /> Đang áp dụng</label>
              <div className="admin-management-modal-actions">
                <button type="button" className="btn-admin is-secondary" onClick={closeManagementForm} disabled={saving}>Hủy</button>
                <button className="btn-admin" disabled={saving}><FiSave /> {saving ? "Đang lưu..." : "Lưu khuyến mãi"}</button>
              </div>
            </form>
          ) : (
            <form className="admin-management-form admin-management-modal-card" onSubmit={saveBranchCombo} role="dialog" aria-modal="true" aria-labelledby="admin-branch-combo-title">
              <div className="admin-management-modal-header"><div><p className="admin-section-kicker">Phân phối</p><h3 id="admin-branch-combo-title">Combo theo chi nhánh</h3></div><button type="button" className="admin-modal-close" onClick={closeManagementForm} aria-label="Đóng cửa sổ"><FiX /></button></div>
              <label className="admin-management-field">Chi nhánh<select required value={branchComboForm.theatreId} onChange={(e) => setBranchComboForm({ ...branchComboForm, theatreId: e.target.value })}><option value="">Chọn chi nhánh</option>{(data.theatres || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="admin-management-field">Combo<select required value={branchComboForm.comboId} onChange={(e) => setBranchComboForm({ ...branchComboForm, comboId: e.target.value })}><option value="">Chọn combo</option>{data.combos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="admin-management-field">Giá riêng<input type="number" min="0" step="1000" placeholder="Để trống để dùng giá chung" value={branchComboForm.priceOverride} onChange={(e) => setBranchComboForm({ ...branchComboForm, priceOverride: e.target.value })} /></label>
              <label className="admin-check-row"><input type="checkbox" checked={branchComboForm.isAvailable} onChange={(e) => setBranchComboForm({ ...branchComboForm, isAvailable: e.target.checked })} /> Chi nhánh đang bán combo này</label>
              <div className="admin-management-modal-actions"><button type="button" className="btn-admin is-secondary" onClick={closeManagementForm} disabled={saving}>Hủy</button><button className="btn-admin" disabled={saving}><FiSave /> {saving ? "Đang lưu..." : "Lưu phân phối"}</button></div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
};
