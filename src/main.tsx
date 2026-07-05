import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { WalletProvider } from "./components/WalletProvider";
import "./styles.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            color: "#ff5a3c",
            background: "#0a0b08",
            padding: 20,
            fontSize: 12,
            whiteSpace: "pre-wrap",
            minHeight: "100vh",
          }}
        >
          RENDER ERROR:{"\n"}
          {this.state.error.message}
          {"\n\n"}
          {this.state.error.stack}
        </pre>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (e) => {
  const el = document.getElementById("root");
  if (el && el.innerHTML.trim() === "") {
    el.innerHTML = `<pre style="color:#ff5a3c;background:#0a0b08;padding:20px;font-size:12px;white-space:pre-wrap;min-height:100vh;">GLOBAL ERROR:\n${e.message}\n\n${e.filename}:${e.lineno}:${e.colno}\n\n${e.error?.stack ?? ""}</pre>`;
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletProvider>
        <App />
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
