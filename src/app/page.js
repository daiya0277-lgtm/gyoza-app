"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // ★ここがポイント

const PICKUP_DATE = "2025-11-30";

export default function HomePage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Firestore から在庫を取得
  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("sortOrder"));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProducts(list);
      } catch (err) {
        console.error(err);
        setFetchError("在庫情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleReserveClick = () => {
    router.push("/reserve");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f7",
        padding: "24px 16px 40px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        color: "#111111",
      }}
    >
      {/* 中央寄せコンテナ */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* ヘッダー行 */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
              }}
            >
              ゼミ餃子予約サイト
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#555",
              }}
            >
              事前予約専用ページです。当日はこの画面を提示してください。
            </p>
          </div>

          {/* 管理画面へのリンク（右上） */}
          <button
            type="button"
            onClick={() => router.push("/admin")}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 12,
              color: "#555",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            管理画面へ
          </button>
        </header>

        {/* 販売情報カード */}
        <section
          style={{
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 20,
              boxShadow:
                "0 18px 45px rgba(15, 23, 42, 0.08)",
              border: "1px solid #eee",
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                margin: "0 0 10px",
              }}
            >
              販売情報
            </h2>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>販売期間：</span>
                {PICKUP_DATE}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>受け取り時間：</span>
                9:00〜19:00（30分刻み）
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>場所：</span>
                今出川キャンパス
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>支払い方法：</span>
                当日現金のみ
              </div>
            </div>
          </div>
        </section>

        {/* 在庫読み込みステータス */}
        {loading && <p>在庫情報を読み込み中です...</p>}
        {fetchError && (
          <p style={{ color: "red" }}>{fetchError}</p>
        )}

        {/* 商品カード一覧 */}
        {!loading && !fetchError && (
          <section>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              商品一覧
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {products.map((p) => (
                <article
                  key={p.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    padding: 20,
                    boxShadow:
                      "0 18px 45px rgba(15, 23, 42, 0.06)",
                    border: "1px solid #eee",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 180,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        margin: "0 0 6px",
                      }}
                    >
                      {p.name}
                    </h3>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      3個入り（1セット）
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {p.price}円
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        / セット
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#777",
                      }}
                    >
                      在庫：残り {p.stockRemaining} / {p.stockTotal} セット
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleReserveClick}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#f97316",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        boxShadow:
                          "0 12px 25px rgba(249, 115, 22, 0.35)",
                      }}
                    >
                      予約する
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
