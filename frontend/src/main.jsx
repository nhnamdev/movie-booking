import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Analytics } from "@vercel/analytics/react";
import axios from "axios";

import reduxStore from "./reduxStore.js";

axios.defaults.withCredentials = true;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={reduxStore}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
    {import.meta.env.PROD && <Analytics />}
  </React.StrictMode>
);
