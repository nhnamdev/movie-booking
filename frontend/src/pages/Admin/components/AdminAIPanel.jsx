import { useState } from "react";
import { FaMagic } from "react-icons/fa";
import { getAdminAnalytics } from "../../../utils/aiClient";

export const AdminAIPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await getAdminAnalytics();
      setData(res.data);
    } catch {
      setData({ error: "Không thể tải phân tích AI lúc này." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-ai-panel">
      <div className="admin-ai-title">
        <div>
          <p className="admin-section-kicker">Trợ lý dữ liệu</p>
          <h2>
            <FaMagic aria-hidden="true" />
            <span>Phân tích AI</span>
          </h2>
        </div>
        <button className="admin-ai-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? "Đang phân tích..." : "Phân tích ngay"}
        </button>
      </div>

      {data?.error && <p className="admin-ai-error">{data.error}</p>}

      {data?.stats && (
        <div className="admin-ai-stats">
          <div className="admin-ai-stat">
            <p className="admin-ai-stat-label">Tổng doanh thu</p>
            <p className="admin-ai-stat-value">
              {Number(data.stats.totalRevenue).toLocaleString("vi-VN")}đ
            </p>
          </div>
          <div className="admin-ai-stat">
            <p className="admin-ai-stat-label">Vé đã bán</p>
            <p className="admin-ai-stat-value">{data.stats.totalTickets}</p>
          </div>
          <div className="admin-ai-stat">
            <p className="admin-ai-stat-label">Khách hàng</p>
            <p className="admin-ai-stat-value">{data.stats.totalCustomers}</p>
          </div>
        </div>
      )}

      {data?.insights && <div className="admin-ai-insights">{data.insights}</div>}
    </div>
  );
};
