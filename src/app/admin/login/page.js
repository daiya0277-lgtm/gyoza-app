"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_PASSWORD = "zemi-gyoza"; // 好きなパスワードに変えてOK

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // ログイン状態をブラウザに保存
      if (typeof window !== "undefined") {
        localStorage.setItem("zemiAdminAuthed", "1");
      }
      router.push("/admin");
    } else {
      setError("パスワードが違います");
    }
  };

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        管理画面ログイン
      </h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        ゼミメンバー用ページです。パスワードを入力してください。
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="管理パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 8,
          }}
        />
        {error && (
          <p style={{ color: "red", fontSize: 12, marginBottom: 8 }}>{error}</p>
        )}
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: 24,
            border: "none",
            backgroundColor: "#f97316",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ログイン
        </button>
      </form>
    </main>
  );
}
