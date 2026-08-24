import { useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "../../components/Navbar";
import { MovieInfoSection } from "./components/MovieInfoSection";
import { MovieReviewsSection } from "./components/MovieReviewsSection";
import { MovieInfoCollection } from "./components/MovieInfoCollection";
import { Footer } from "../../components/Footer";

const MovieDetailsPage = () => {
  const { id } = useParams();
  const movieId = Number(id);
  const [syncedRating, setSyncedRating] = useState(null);
  const [syncedTotalReviews, setSyncedTotalReviews] = useState(null);

  const handleRatingUpdated = (newAvgRating, newTotalReviews) => {
    setSyncedRating(newAvgRating);
    setSyncedTotalReviews(newTotalReviews);
  };

  return (
    <>
      <Navbar />
      <MovieInfoSection
        ratingOverride={syncedRating}
        totalReviewsOverride={syncedTotalReviews}
      />
      <MovieReviewsSection
        movieId={movieId}
        onRatingUpdated={handleRatingUpdated}
      />
      <MovieInfoCollection />
      <Footer />
    </>
  );
};

export default MovieDetailsPage;
