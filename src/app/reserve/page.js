"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

const PICKUP_DATE = "2025-11-30"; // 販売日（例）

// 9:00〜19:00 を30分刻みで生成
function generateTimeSlots() {
  const slots = [];
  for (let h = 9; h <= 19; h++) {
    for (let m of [0, 30]) {
      if (h === 19 && m === 30) continue; // 19:30 はいらない
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

export default function ReservePage() {
  const router = useRouter();

  const [products, setProducts] = useState([]); // Firestoreからの在庫
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // フォームの状態
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [counts, setCounts] = useState({
    yaki: 0,
    craft: 0,
    cheese: 0,
  });
  const [pickupTime, setPickupTime] = useState("");

  // エラーメッセージ
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Firestoreから在庫を取得
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

  // 合計金額の計算
  const totalAmount = useMemo(() => {
    return products.reduce((sum, p) => {
      const c = counts[p.id] || 0;
      return sum + c * p.price;
    }, 0);
  }, [products, counts]);

  // 数量変更ハンドラ
  const handleChangeCount = (id, value, max) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    if (num < 0) return;
    if (max != null && num > max) return;
    setCounts((prev) => ({ ...prev, [id]: num }));
  };

  // バリデーション
  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "名前を入力してください";
    }

    if (!phone.trim()) {
      newErrors.phone = "電話番号を入力してください";
    } else if (!/^[0-9-]+$/.test(phone.trim())) {
      newErrors.phone = "数字とハイフンのみで入力してください";
    }

    const totalCount =
      (counts.yaki || 0) + (counts.craft || 0) + (counts.cheese || 0);
    if (totalCount === 0) {
      newErrors.counts = "最低1セット以上選択してください";
    }

    // 在庫超過チェック
    for (const p of products) {
      const c = counts[p.id] || 0;
      if (c > p.stockRemaining) {
        newErrors[`count_${p.id}`] = `在庫が足りません（残り ${p.stockRemaining} セット）`;
      }
    }

    if (!pickupTime) {
      newErrors.pickupTime = "受け取り時間を選択してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const reservationId = await runTransaction(db, async (tx) => {
        // 最新の在庫を取得
        const productDocs = await Promise.all(
          products.map((p) => tx.get(doc(db, "products", p.id)))
        );

        const productMap = {};
        productDocs.forEach((snap) => {
          productMap[snap.id] = snap.data();
        });

        // 在庫チェック
        for (const p of products) {
          const ordered = counts[p.id] || 0;
          if (ordered === 0) continue;

          const current = productMap[p.id].stockRemaining;
          const after = current - ordered;
          if (after < 0) {
            throw new Error(`在庫不足: ${p.name}`);
          }

          // 在庫更新
          tx.update(doc(db, "products", p.id), {
            stockRemaining: after,
          });
        }

        const total = products.reduce((sum, p) => {
          const c = counts[p.id] || 0;
          return sum + c * p.price;
        }, 0);

        // 予約ドキュメント作成
        const reservationRef = doc(collection(db, "reservations"));
        tx.set(reservationRef, {
          name: name.trim(),
          phone: phone.trim(),
          items: { ...counts },
          totalAmount: total,
          pickupDate: PICKUP_DATE,
          pickupTime,
          createdAt: serverTimestamp(),
        });

        return reservationRef.id;
      });

      // 完了画面へ（予約IDをクエリで渡す）
      router.push(`/reserve/complete?id=${reservationId}`);
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.message.includes("在庫不足")
          ? "申し訳ありません、在庫が足りませんでした。数量を確認して再度お試しください。"
          : "サーバーエラーが発生しました。時間をおいて再度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: 640, // スマホでも読みやすい幅
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
          予約フォーム
        </h1>
        <p style={{ marginBottom: 20, fontSize: 13, color: "#4b5563" }}>
          必要事項を入力のうえ、「確認して予約する」ボタンを押してください。
        </p>

        {loading && <p>在庫情報を読み込み中...</p>}
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

        {!loading && !fetchError && (
          <form onSubmit={handleSubmit}>
            {/* 受け取り情報 */}
            <section
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <h2 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600 }}>
                受け取り情報
              </h2>
              <p style={{ margin: 0, fontSize: 13 }}>
                受け取り日：{PICKUP_DATE}（固定）
              </p>
            </section>

            {/* 名前 */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                名前（必須）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例）山田 太郎"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
              {errors.name && (
                <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* 電話番号 */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                電話番号（必須）
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="例）090-1234-5678"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
              {errors.phone && (
                <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* 注文数 */}
            <section
              style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
              }}
            >
              <h2 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600 }}>
                注文内容
              </h2>

              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    gap: 12,
                    flexWrap: "wrap", // スマホでは縦並びになるように
                  }}
                >
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {p.price}円 / 3個入り（1セット）
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      在庫：残り {p.stockRemaining} / {p.stockTotal} セット
                    </div>
                    {errors[`count_${p.id}`] && (
                      <p
                        style={{
                          color: "red",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {errors[`count_${p.id}`]}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <input
                      type="number"
                      min={0}
                      max={p.stockRemaining}
                      value={counts[p.id] ?? 0}
                      onChange={(e) =>
                        handleChangeCount(
                          p.id,
                          e.target.value,
                          p.stockRemaining
                        )
                      }
                      style={{
                        width: 96,
                        padding: 8,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        textAlign: "right",
                        fontSize: 14,
                      }}
                    />
                    <span style={{ marginLeft: 4, fontSize: 13 }}>セット</span>
                  </div>
                </div>
              ))}

              {errors.counts && (
                <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>
                  {errors.counts}
                </p>
              )}
            </section>

            {/* 受け取り時間 */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                受け取り時間（必須）
              </label>
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="">選択してください</option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.pickupTime && (
                <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>
                  {errors.pickupTime}
                </p>
              )}
            </div>

            {/* 合計金額 + 注意書き */}
            <section style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                合計金額：{totalAmount.toLocaleString()}円
              </p>
              <ul style={{ fontSize: 12, color: "#6b7280", paddingLeft: 18 }}>
                <li>受け取り時間に遅れる場合はお電話ください。</li>
                <li>支払いは当日現金のみです。</li>
              </ul>
            </section>

            {submitError && (
              <p style={{ color: "red", marginBottom: 12 }}>{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", // スマホでは横いっぱい
                padding: "12px 20px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: "#f97316",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 15,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow:
                  "0 10px 15px -3px rgba(249,115,22,0.4), 0 4px 6px -4px rgba(249,115,22,0.4)",
              }}
            >
              {submitting ? "送信中..." : "確認して予約する"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
