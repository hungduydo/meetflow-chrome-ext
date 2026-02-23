import { jsx as _jsx } from "react/jsx-runtime";
// src/sidebar.tsx — React entry for the injected sidebar iframe
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/Sidebar.js";
import "./styles/globals.css";
const root = document.getElementById("root");
createRoot(root).render(_jsx(StrictMode, { children: _jsx(Sidebar, {}) }));
