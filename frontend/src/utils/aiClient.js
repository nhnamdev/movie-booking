import axios from "axios";
import { API_URL } from "./apiUrl";

const ai = axios.create({ baseURL: `${API_URL}/ai` });

export const chatWithAI = (messages) => ai.post("/chat", { messages });
export const getRecommendations = (email) => ai.post("/recommendations", { email });
export const searchMoviesAI = (query) => ai.post("/search", { query });
export const generateMovieDescription = (data) => ai.post("/admin/generateDescription", data);
export const getAdminAnalytics = () => ai.get("/admin/analytics");
