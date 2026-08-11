import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FiGift } from "react-icons/fi";
import { useSelector } from "react-redux";
import ClipLoader from "react-spinners/esm/ClipLoader.js";
import { API_URL } from "../utils/apiUrl";

const formatVND = (value) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export const RewardPointsSelector = ({ grossAmount, value, onChange, onDiscountChange, disabled = false, compact = false }) => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const [rewardData, setRewardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRewards = async () => {
      if (signedPerson.person_type !== "Customer") {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.post(`${API_URL}/customerRewards`, {
          email: signedPerson.email,
        });
        if (active) setRewardData(response.data);
      } catch (err) {
        console.error("Reward points load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadRewards();
    return () => { active = false; };
  }, [signedPerson.email, signedPerson.person_type]);

  const redeemValue = Number(rewardData?.config?.redeemValuePerPoint || 1000);
  const maxPercent = Number(rewardData?.config?.maximumRedemptionPercent || 50);
  const maximum = useMemo(
    () => Math.max(0, Math.min(
      Number(rewardData?.account?.availablePoints || 0),
      Math.floor(Number(grossAmount || 0) * maxPercent / 100 / redeemValue)
    )),
    [grossAmount, maxPercent, redeemValue, rewardData?.account?.availablePoints]
  );

  useEffect(() => {
    if (Number(value || 0) > maximum) onChange(maximum, maximum * redeemValue);
  }, [maximum, onChange, redeemValue, value]);

  const selected = Math.min(maximum, Math.max(0, Number(value || 0)));
  useEffect(() => {
    onDiscountChange?.(selected * redeemValue);
  }, [onDiscountChange, redeemValue, selected]);

  if (loading) return <div className={`reward-selector ${compact ? "is-compact" : ""}`}><ClipLoader color="#eb3656" size={20} /><span>Đang tải điểm...</span></div>;
  if (!rewardData) return null;

  const update = (nextValue) => {
    const normalized = Math.min(maximum, Math.max(0, Number(nextValue) || 0));
    onChange(normalized, normalized * redeemValue);
  };

  return (
    <section className={`reward-selector ${compact ? "is-compact" : ""}`}>
      <div className="reward-selector-heading">
        <FiGift aria-hidden="true" />
        <div><strong>Dùng điểm thưởng</strong><small>Khả dụng: {rewardData.account.availablePoints.toLocaleString("vi-VN")} điểm{rewardData.account.heldPoints ? ` · Đang giữ: ${rewardData.account.heldPoints}` : ""}</small></div>
      </div>
      {maximum > 0 ? (
        <>
          <div className="reward-selector-control">
            <input type="range" min="0" max={maximum} step="1" value={selected} disabled={disabled} onChange={(e) => update(e.target.value)} />
            <input type="number" min="0" max={maximum} value={selected} disabled={disabled} onChange={(e) => update(e.target.value)} aria-label="Số điểm muốn sử dụng" />
          </div>
          <div className="reward-selector-meta"><span>Tối đa {maximum} điểm</span><strong>Giảm {formatVND(selected * redeemValue)}</strong></div>
        </>
      ) : <p className="reward-selector-empty">Đơn hiện chưa đủ điều kiện hoặc bạn chưa có điểm khả dụng.</p>}
      <p className="reward-selector-rule">1 điểm = {formatVND(redeemValue)} · Dùng tối đa {maxPercent}% giá trị đơn</p>
    </section>
  );
};
