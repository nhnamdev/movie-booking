import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { showLoginModal } from "../../../reducers/authSlice";
import { FiStar, FiEdit2, FiTrash2, FiCheckCircle, FiMessageSquare, FiSend, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { toastFontStyle, toastPrimaryCategories } from "../../../toasts/toast";

const RATING_DESCRIPTIONS = {
  10: "Siêu phẩm xuất sắc!",
  9: "Rất hay, tuyệt vời!",
  8: "Hay, rất đáng xem",
  7: "Khá ổn, giải trí tốt",
  6: "Bình thường, xem tạm được",
  5: "Trung bình",
  4: "Dưới kỳ vọng",
  3: "Không ấn tượng",
  2: "Khá tệ",
  1: "Rất tệ",
};

export const MovieReviewsSection = ({ movieId, onRatingUpdated }) => {
  const [reviewsData, setReviewsData] = useState({
    total_reviews: 0,
    average_rating: 0,
    rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    user_review: null,
    has_purchased: false,
    reviews: [],
  });

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Form states
  const [selectedRating, setSelectedRating] = useState(10);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState("");

  const { isAuthenticated, signedPerson } = useSelector((store) => store.authentication);
  const dispatch = useDispatch();

  const fetchReviews = useCallback(async () => {
    if (!movieId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/movieReviews/${movieId}`, {
        withCredentials: true,
      });

      if (res.data) {
        setReviewsData(res.data);
        if (res.data.user_review) {
          setSelectedRating(Number(res.data.user_review.rating) || 10);
          setCommentText(res.data.user_review.comment || "");
        }
        if (onRatingUpdated) {
          onRatingUpdated(res.data.average_rating, res.data.total_reviews);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải đánh giá phim:", err);
    } finally {
      setLoading(false);
    }
  }, [movieId, onRatingUpdated]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenReviewForm = () => {
    if (!isAuthenticated) {
      dispatch(showLoginModal());
      return;
    }
    if (reviewsData.user_review) {
      setSelectedRating(Number(reviewsData.user_review.rating) || 10);
      setCommentText(reviewsData.user_review.comment || "");
    } else {
      setSelectedRating(10);
      setCommentText("");
    }
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      dispatch(showLoginModal());
      return;
    }

    if (!selectedRating || selectedRating < 1 || selectedRating > 10) {
      toast.error("Vui lòng chọn số sao từ 1 đến 10", {
        ...toastPrimaryCategories,
        style: toastFontStyle,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/movieReview`,
        {
          movieId,
          rating: selectedRating,
          comment: commentText.trim(),
        },
        { withCredentials: true }
      );

      toast.success(res.data.message || "Đã gửi đánh giá thành công!", {
        ...toastPrimaryCategories,
        style: toastFontStyle,
      });

      setShowReviewForm(false);
      await fetchReviews();
    } catch (err) {
      console.error("Lỗi khi lưu đánh giá:", err);
      const msg = err.response?.data?.message || "Không thể gửi đánh giá. Vui lòng thử lại.";
      toast.error(msg, {
        ...toastPrimaryCategories,
        style: toastFontStyle,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) return;

    try {
      setIsDeleting(true);
      const res = await axios.delete(
        `${import.meta.env.VITE_API_URL}/movieReview/${reviewId || movieId}`,
        { withCredentials: true }
      );

      toast.success(res.data.message || "Đã xóa đánh giá", {
        ...toastPrimaryCategories,
        style: toastFontStyle,
      });

      setShowReviewForm(false);
      setSelectedRating(10);
      setCommentText("");
      await fetchReviews();
    } catch (err) {
      console.error("Lỗi xóa đánh giá:", err);
      const msg = err.response?.data?.message || "Không thể xóa đánh giá";
      toast.error(msg, {
        ...toastPrimaryCategories,
        style: toastFontStyle,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const currentDisplayRating = hoverRating || selectedRating;
  const totalReviewsCount = reviewsData.total_reviews || 0;
  const avgScore = Number(reviewsData.average_rating || 0);

  return (
    <section className="cgv-reviews-section">
      <div className="cgv-reviews-container">
        {/* Section Header */}
        <div className="cgv-reviews-header">
          <div className="cgv-reviews-title-wrap">
            <span className="cgv-reviews-badge">
              <FiMessageSquare /> ĐÁNH GIÁ CỘNG ĐỒNG
            </span>
            <h2 className="cgv-reviews-title">Khán Giả Nói Gì Về Bộ Phim</h2>
            <p className="cgv-reviews-subtitle">
              Điểm số trung bình được tính toán tự động dựa trên {totalReviewsCount} lượt đánh giá thực tế từ khán giả.
            </p>
          </div>

          <div className="cgv-reviews-cta-wrap">
            <button
              type="button"
              className="cgv-review-btn-primary"
              onClick={handleOpenReviewForm}
            >
              {reviewsData.user_review ? (
                <>
                  <FiEdit2 /> Sửa đánh giá của bạn
                </>
              ) : (
                <>
                  <FiStar /> Viết đánh giá của bạn
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rating Summary Scoreboard */}
        <div className="cgv-rating-summary-card">
          {/* Col 1: Average Score */}
          <div className="cgv-summary-score-col">
            <div className="cgv-score-number-wrap">
              <span className="cgv-score-big">{avgScore > 0 ? avgScore.toFixed(1) : "—"}</span>
              <span className="cgv-score-max">/10</span>
            </div>
            <div className="cgv-score-stars-row">
              {[1, 2, 3, 4, 5].map((starIdx) => {
                const filledRatio = Math.max(0, Math.min(1, (avgScore / 2) - (starIdx - 1)));
                return (
                  <span key={starIdx} className={`cgv-summary-star ${filledRatio >= 0.7 ? "full" : filledRatio >= 0.3 ? "half" : "empty"}`}>
                    ★
                  </span>
                );
              })}
            </div>
            <p className="cgv-score-count-text">
              {totalReviewsCount > 0
                ? `Dựa trên ${totalReviewsCount} lượt đánh giá`
                : "Chưa có lượt đánh giá nào"}
            </p>
            {reviewsData.has_purchased && (
              <span className="cgv-verified-viewer-pill">
                <FiCheckCircle /> Bạn đã xem phim tại CGV
              </span>
            )}
          </div>

          {/* Col 2: Breakdown Bars */}
          <div className="cgv-summary-breakdown-col">
            <h4 className="cgv-breakdown-title">Phân Bổ Đánh Giá Khán Giả</h4>
            {[
              { level: 5, label: "9 - 10 sao (Tuyệt vời)" },
              { level: 4, label: "7 - 8 sao (Hay)" },
              { level: 3, label: "5 - 6 sao (Tạm ổn)" },
              { level: 2, label: "3 - 4 sao (Kém)" },
              { level: 1, label: "1 - 2 sao (Rất tệ)" },
            ].map(({ level, label }) => {
              const count = reviewsData.rating_breakdown[level] || 0;
              const percent = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
              return (
                <div key={level} className="cgv-breakdown-row">
                  <span className="cgv-breakdown-label">{label}</span>
                  <div className="cgv-breakdown-bar-bg">
                    <div
                      className={`cgv-breakdown-bar-fill level-${level}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="cgv-breakdown-percent">{percent}% ({count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal / Form for writing review */}
        {showReviewForm && (
          <div className="cgv-review-form-wrapper" id="review-form-box">
            <div className="cgv-review-form-header">
              <h3>
                {reviewsData.user_review ? "Chỉnh Sửa Đánh Giá Của Bạn" : "Chia Sẻ Trải Nghiệm & Đánh Giá Phim"}
              </h3>
              <button
                type="button"
                className="cgv-review-close-btn"
                onClick={() => setShowReviewForm(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="cgv-review-form">
              {/* Star Rating Selector (1 to 10) */}
              <div className="cgv-interactive-rating-box">
                <label className="cgv-rating-input-label">
                  Điểm số bạn dành cho phim: <strong>{currentDisplayRating}/10</strong>
                  <span className="cgv-rating-tagline">
                    ({RATING_DESCRIPTIONS[currentDisplayRating] || ""})
                  </span>
                </label>

                <div className="cgv-star-rating-selector" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => {
                    const isActive = starVal <= (hoverRating || selectedRating);
                    return (
                      <button
                        key={starVal}
                        type="button"
                        className={`cgv-star-btn ${isActive ? "active" : ""}`}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onClick={() => setSelectedRating(starVal)}
                        title={`${starVal} sao - ${RATING_DESCRIPTIONS[starVal]}`}
                      >
                        ★
                        <span className="cgv-star-number">{starVal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="cgv-review-input-group">
                <label htmlFor="reviewComment">Cảm nhận chi tiết của bạn (tùy chọn):</label>
                <textarea
                  id="reviewComment"
                  rows={4}
                  placeholder="Bạn thích điều gì ở bộ phim? Diễn xuất, cốt truyện hay âm thanh hình ảnh? Hãy chia sẻ cho cộng đồng khán giả CGV cùng biết nhé..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={1000}
                />
                <span className="cgv-char-count">{commentText.length}/1000 ký tự</span>
              </div>

              {/* Actions */}
              <div className="cgv-review-form-actions">
                {reviewsData.user_review && (
                  <button
                    type="button"
                    className="cgv-btn-delete-review"
                    onClick={() => handleDeleteReview(reviewsData.user_review.id)}
                    disabled={isDeleting || isSubmitting}
                  >
                    <FiTrash2 /> {isDeleting ? "Đang xóa..." : "Xóa đánh giá"}
                  </button>
                )}

                <div className="cgv-form-right-actions">
                  <button
                    type="button"
                    className="cgv-btn-cancel-review"
                    onClick={() => setShowReviewForm(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="cgv-btn-submit-review"
                    disabled={isSubmitting}
                  >
                    <FiSend /> {isSubmitting ? "Đang gửi..." : reviewsData.user_review ? "Lưu thay đổi" : "Gửi đánh giá"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Reviews List */}
        <div className="cgv-reviews-feed-section">
          <div className="cgv-feed-header">
            <h3 className="cgv-feed-title">
              Tất Cả Bình Luận ({reviewsData.reviews.length})
            </h3>
          </div>

          {loading && reviewsData.reviews.length === 0 ? (
            <div className="cgv-reviews-loading">Đang tải đánh giá...</div>
          ) : reviewsData.reviews.length === 0 ? (
            <div className="cgv-reviews-empty">
              <div className="cgv-empty-icon">🎬</div>
              <h4>Chưa có đánh giá nào cho phim này</h4>
              <p>Hãy là người đầu tiên trải nghiệm và chia sẻ cảm nhận của bạn!</p>
              <button
                type="button"
                className="cgv-review-btn-primary small"
                onClick={handleOpenReviewForm}
              >
                <FiStar /> Đánh giá ngay
              </button>
            </div>
          ) : (
            <div className="cgv-reviews-grid">
              {reviewsData.reviews.map((rev) => {
                const userInitial = (rev.customer_name || "K").trim().charAt(0).toUpperCase();
                const formattedTime = new Date(rev.created_at).toLocaleString("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                const canDelete = rev.is_own_review || signedPerson?.person_type === "Admin";

                return (
                  <div key={rev.id} className={`cgv-review-card ${rev.is_own_review ? "own-review" : ""}`}>
                    <div className="cgv-review-card-header">
                      <div className="cgv-review-user-info">
                        <div className="cgv-user-avatar">{userInitial}</div>
                        <div className="cgv-user-meta">
                          <div className="cgv-user-name-line">
                            <span className="cgv-user-name">{rev.customer_name}</span>
                            {rev.is_own_review && <span className="cgv-own-badge">Bạn</span>}
                          </div>
                          {rev.is_verified_viewer && (
                            <span className="cgv-verified-badge" title="Khách hàng đã mua vé phim này tại CGV">
                              <FiCheckCircle /> Đã mua vé tại CGV
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="cgv-review-rating-box">
                        <div className="cgv-card-stars">
                          <span className="cgv-star-icon">★</span>
                          <span className="cgv-card-score">{rev.rating.toFixed(1)}</span>
                          <span className="cgv-card-score-scale">/10</span>
                        </div>
                        <span className="cgv-review-time">{formattedTime}</span>
                      </div>
                    </div>

                    {rev.comment && (
                      <div className="cgv-review-comment-body">
                        <p>{rev.comment}</p>
                      </div>
                    )}

                    {canDelete && (
                      <div className="cgv-review-card-footer">
                        {rev.is_own_review && (
                          <button
                            type="button"
                            className="cgv-card-action-btn edit"
                            onClick={() => {
                              setSelectedRating(rev.rating);
                              setCommentText(rev.comment || "");
                              setShowReviewForm(true);
                              const formEl = document.getElementById("review-form-box");
                              if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            <FiEdit2 /> Sửa
                          </button>
                        )}
                        <button
                          type="button"
                          className="cgv-card-action-btn delete"
                          onClick={() => handleDeleteReview(rev.id)}
                        >
                          <FiTrash2 /> Xóa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
