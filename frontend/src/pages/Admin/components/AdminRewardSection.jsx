import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../../../utils/apiUrl";

const emptyConfig = {
  earnAmountPerPoint: 10000,
  redeemValuePerPoint: 1000,
  maximumRedemptionPercent: 50,
  pointExpiryDays: "",
};

export const AdminRewardSection = () => {
  const [config, setConfig] = useState(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.post(`${API_URL}/adminRewardConfig`, {})
      .then((response) => setConfig({ ...response.data, pointExpiryDays: response.data.pointExpiryDays ?? "" }))
      .catch((err) => setMessage(err.response?.data?.message || "Không thể tải cấu hình điểm thưởng"))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setConfig((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await axios.post(`${API_URL}/adminRewardConfigUpdate`, config);
      setConfig({ ...response.data, pointExpiryDays: response.data.pointExpiryDays ?? "" });
      setMessage("Đã lưu cấu hình điểm thưởng");
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể lưu cấu hình điểm thưởng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section-panel">
      <div className="admin-section-heading">
        <div><h2>Điểm thưởng</h2><p>Cấu hình quy đổi áp dụng thống nhất ở backend cho vé và combo.</p></div>
      </div>
      {loading ? <p>Đang tải cấu hình...</p> : (
        <form className="admin-management-form admin-reward-form" onSubmit={submit}>
          <label>Số tiền để nhận 1 điểm<input type="number" min="1000" step="1000" value={config.earnAmountPerPoint} onChange={(e) => update("earnAmountPerPoint", e.target.value)} required /></label>
          <label>Giá trị giảm của 1 điểm<input type="number" min="100" step="100" value={config.redeemValuePerPoint} onChange={(e) => update("redeemValuePerPoint", e.target.value)} required /></label>
          <label>Tối đa phần trăm đơn được giảm<input type="number" min="0" max="100" value={config.maximumRedemptionPercent} onChange={(e) => update("maximumRedemptionPercent", e.target.value)} required /></label>
          <label>Điểm hết hạn sau số ngày<input type="number" min="1" placeholder="Để trống nếu không hết hạn" value={config.pointExpiryDays} onChange={(e) => update("pointExpiryDays", e.target.value)} /></label>
          {message ? <p className="admin-form-message" role="status">{message}</p> : null}
          <button className="btn-admin" disabled={saving}>{saving ? "Đang lưu..." : "Lưu cấu hình"}</button>
        </form>
      )}
    </section>
  );
};
