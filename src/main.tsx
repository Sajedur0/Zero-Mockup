import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "./styles.css";
Promise.all([
  document.fonts.load("700 20px Manrope"),
  document.fonts.load('400 20px "DM Sans"'),
  document.fonts.load('700 20px "Playfair Display"'),
  document.fonts.load('400 20px "Noto Sans Bengali"', "বাংলা"),
])
  .catch(() => {})
  .then(() =>
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
