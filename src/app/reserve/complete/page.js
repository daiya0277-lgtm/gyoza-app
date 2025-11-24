"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export default function CompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const id = searchParams.get("id");

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError("予約IDが不正です。");
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "reservations", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("予約が見つかりませんでした。");
        } else {
          setReservation({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error(e);
        setError("予約情報の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleBackTop = () => {
    router.push("/");
  };

  const formatItems = () => {
    if (!reservation?.items) return [];
    const { yaki = 0, craft = 0, cheese = 0 } = reservation.items;
    const lines = [];
    if (yaki > 0) lines.push(`焼き餃子：${yaki} セット`);
    if (craft > 0) lines.push(`クラフト餃子：${craft} セット`);
    if (cheese > 0) lines.push(`チーズ餃子：${cheese} セット`);
    return lines;
  };

  const itemLines = formatItems();

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        color: "#111827",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "16px 16px 32px",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          ご予約ありがとうございます！
        </h1>

        {loading && <p>予約情報を読み込み中です...</p>}

        {error && (
          <p style={{ color: "red", marginTop: 16 }}>
            {error}
            <br />
            お手数ですが、もう一度予約をやり直してください。
          </p>
        )}

        {!loading && !error && reservation && (
          <section
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              予約内容
            </h2>

            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                <strong>お名前：</strong>
                {reservation.name || "（未入力）"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>電話番号：</strong>
                {reservation.phone || "（未入力）"}
              </p>

              <p style={{ margin: "12px 0 4px" }}>
                <strong>注文内容：</strong>
              </p>
              {itemLines.length > 0 ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 14,
                  }}
                >
                  {itemLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: 14 }}>注文はありません。</p>
              )}

              <p style={{ margin: "12px 0 4px" }}>
                <strong>合計金額：</strong>
                {reservation.totalAmount != null
                  ? `${reservation.totalAmount.toLocaleString()}円`
                  : "不明"}
              </p>

              <p style={{ margin: 0 }}>
                <strong>受け取り日時：</strong>
                {reservation.pickupDate} {reservation.pickupTime} 〜
              </p>

              <p
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                ※ 受け取りの際は、この画面を提示するか、お名前をお伝えください。
              </p>
            </div>
          </section>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={handleBackTop}
            style={{
              width: "100%", // スマホで押しやすく
              maxWidth: 260,
              padding: "12px 20px",
              borderRadius: 9999,
              border: "none",
              backgroundColor: "#f97316",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              boxShadow:
                "0 10px 15px -3px rgba(249,115,22,0.4), 0 4px 6px -4px rgba(249,115,22,0.4)",
              display: "block",
              marginInline: "auto",
            }}
          >
            トップに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
