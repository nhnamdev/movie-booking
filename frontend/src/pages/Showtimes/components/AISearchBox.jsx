import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaRobot } from "react-icons/fa";
import { searchMoviesAI } from "../../../utils/aiClient";

export const AISearchBox = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await searchMoviesAI(q);
      setResults(res.data);
    } catch {
      setResults({ movies: [], interpretation: "Không thể tìm kiếm lúc này." });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="ai-search-container">
      <div className="ai-search-box">
        <FaRobot style={{ color: "#EB3656", fontSize: "1.8rem", alignSelf: "center", marginLeft: "0.8rem" }} />
        <input
          className="ai-search-input"
          placeholder='Tìm phim bằng AI... vd: "phim hành động cuối tuần"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="ai-search-btn"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          <FaSearch />
          {loading ? "Đang tìm..." : "Tìm"}
        </button>
      </div>

      {results && (
        <>
          {results.interpretation && (
            <div className="ai-search-interpretation">
              🤖 {results.interpretation}
            </div>
          )}
          {results.movies?.length > 0 && (
            <div className="ai-search-results">
              {results.movies.map((m) => (
                <div
                  key={m.id}
                  className="ai-search-result-item"
                  onClick={() => navigate(`/movieDetails/${m.id}`)}
                >
                  <img src={m.image_path} alt={m.name} />
                  <div>
                    <p className="ai-search-result-name">{m.name}</p>
                    <p className="ai-search-result-genre">{m.genres}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.movies?.length === 0 && (
            <p style={{ color: "#767780", fontSize: "1.3rem", marginTop: "1rem", textAlign: "center" }}>
              Không tìm thấy phim phù hợp.
            </p>
          )}
        </>
      )}
    </div>
  );
};
