import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style/index.css";
// Listen for Vite's preload error event and reload the page to recover from it. 
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});
// Render the root React component (App) into the DOM element with the ID "root". This is the entry point of the React application.
ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);