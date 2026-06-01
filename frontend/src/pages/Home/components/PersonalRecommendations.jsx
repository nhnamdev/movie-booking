import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setRecommendations, setRecsLoading } from "../../../reducers/aiSlice";
import { getRecommendations } from "../../../utils/aiClient";

export const PersonalRecommendations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, signedPerson } = useSelector((s) => s.authentication);
  const { recommendations, recsLoading } = useSelector((s) => s.ai);

  useEffect(() => {
    if (!isAuthenticated || signedPerson.person_type !== "Customer") return;
    if (recommendations.length > 0) return;

    dispatch(setRecsLoading(true));
    getRecommendations(signedPerson.email)
      .then((res) => dispatch(setRecommendations(res.data.recommendations || [])))
      .catch(() => dispatch(setRecommendations([])))
      .finally(() => dispatch(setRecsLoading(false)));
  }, [dispatch, isAuthenticated, recommendations.length, signedPerson.email, signedPerson.person_type]);

  if (!isAuthenticated || signedPerson.person_type !== "Customer") return null;
  if (recsLoading) return null;
  if (recommendations.length === 0) return null;

  return (
    <section className="section-ai-recommendations">
      <div className="home-collection-heading-container">
        <h1 className="heading-secondary heading-collection">
          Dành riêng cho bạn
        </h1>
        <p className="section-heading-copy">
          Gợi ý dựa trên lịch sử đặt vé và sở thích xem phim của bạn.
        </p>
      </div>
      <div className="ai-recs-grid">
        {recommendations.map(({ movieId, reason, movie }) => (
          <div
            key={movieId}
            className="ai-rec-card"
            onClick={() => navigate(`/movieDetails/${movieId}`)}
          >
            <div className="ai-rec-img-box">
              <img src={movie.image_path} alt={movie.name} />
              <span className="ai-rec-badge">AI gợi ý</span>
            </div>
            <p className="ai-rec-title">{movie.name}</p>
            <p className="ai-rec-reason">{reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
