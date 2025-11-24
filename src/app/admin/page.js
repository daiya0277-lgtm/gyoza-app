"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

const thStyle = {
  padding: "8px 6px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 6px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

export default function AdminPage() {
  const router = useRouter();

  const [reservations, setReservations] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // 在庫編集用
  const [stockEdits, setStockEdits] = useState({});
  const [stockMessage, setStockMessage] = useState("");

  // 予約操作メッセージ
  const [reservationMessage, setReservationMessage] = useState("");

  // ---------------------------
  // ログインチェック + 初期データ取得
  // ---------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authed = localStorage.getItem("zemiAdminAuthed") === "1";
    if (!authed) {
      router.replace("/admin/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        // 予約データ
        const rq = query(
          collection(db, "reservations"),
          orderBy("pickupDate"),
          orderBy("pickupTime")
        );
        const rsnap = await getDocs(rq);
        const rlist = rsnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setReservations(rlist);

        // 商品データ（在庫）
        const pq = query(collection(db, "products"), orderBy("sortOrder"));
        const psnap = await getDocs(pq);
        const plist = psnap.docs.map((d) => ({
          id: d.id,
          ...d.data(), // name, price, stockTotal, stockRemaining など
        }));
        setProducts(plist);

        // 在庫編集入力の初期値
        const initialEdits = {};
        plist.forEach((p) => {
          initialEdits[p.id] = p.stockRemaining;
        });
        setStockEdits(initialEdits);
      } catch (err) {
        console.error(err);
        setFetchError("予約・在庫情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  // ---------------------------
  // 集計（焼き/クラフト/チーズ・売上）
  // ---------------------------
  const summary = useMemo(() => {
    let yaki = 0;
    let craft = 0;
    let cheese = 0;
    let totalSales = 0;

    for (const r of reservations) {
      const items = r.items || {};
      yaki += items.yaki || 0;
      craft += items.craft || 0;
      cheese += items.cheese || 0;
      totalSales += r.totalAmount || 0;
    }

    return { yaki, craft, cheese, totalSales };
  }, [reservations]);

  // ---------------------------
  // 在庫更新ボタン
  // ---------------------------
  const handleUpdateStock = async (productId) => {
    setStockMessage("");
    setReservationMessage("");

    const editValue = stockEdits[productId];
    const num = Number(editValue);

    if (!Number.isFinite(num) || num < 0) {
      setStockMessage("在庫は0以上の数値で入力してください");
      return;
    }

    const target = products.find((p) => p.id === productId);
    if (!target) {
      setStockMessage("対象の商品が見つかりません");
      return;
    }

    if (num > target.stockTotal) {
      setStockMessage(`在庫は最大 ${target.stockTotal} セットまでです`);
      return;
    }

    try {
      await updateDoc(doc(db, "products", productId), {
        stockRemaining: num,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stockRemaining: num } : p
        )
      );

      setStockMessage("在庫を更新しました");
    } catch (err) {
      console.error(err);
      setStockMessage("在庫の更新に失敗しました");
    }
  };

  // ---------------------------
  // 予約キャンセル（削除 + 在庫を戻す）
  // ---------------------------
  const handleDeleteReservation = async (reservation) => {
    setReservationMessage("");
    setStockMessage("");

    const ok = window.confirm(
      `この予約をキャンセルして削除しますか？\n` +
        `受け取り日時: ${reservation.pickupDate} ${reservation.pickupTime}\n` +
        `お名前: ${reservation.name}`
    );
    if (!ok) return;

    try {
      await runTransaction(db, async (transaction) => {
        const items = reservation.items || {};
        const productIds = ["yaki", "craft", "cheese"];

        // ① 先に読み取りを全部終わらせる
        const productSnaps = {};
        for (const pid of productIds) {
          const count = items[pid] || 0;
          if (count <= 0) continue;

          const pref = doc(db, "products", pid);
          const psnap = await transaction.get(pref);
          productSnaps[pid] = psnap;
        }

        // ② その後で書き込み
        for (const pid of productIds) {
          const count = items[pid] || 0;
          if (count <= 0) continue;

          const psnap = productSnaps[pid];
          if (!psnap || !psnap.exists()) continue;

          const pdata = psnap.data();
          const current = pdata.stockRemaining || 0;
          const total = pdata.stockTotal || 0;

          let next = current + count;
          if (next > total) next = total;

          const pref = doc(db, "products", pid);
          transaction.update(pref, { stockRemaining: next });
        }

        // ③ 予約ドキュメントを削除
        const rref = doc(db, "reservations", reservation.id);
        transaction.delete(rref);
      });

      // 画面からも予約を消す
      setReservations((prev) => prev.filter((r) => r.id !== reservation.id));

      // 在庫表示を最新に
      const psnap = await getDocs(
        query(collection(db, "products"), orderBy("sortOrder"))
      );
      const plist = psnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setProducts(plist);

      setReservationMessage("予約をキャンセルし、在庫を戻しました");
    } catch (err) {
      console.error(err);
      setReservationMessage("予約のキャンセルに失敗しました");
    }
  };

  // ---------------------------
  // 画面描画（背景白＆文字黒に変更済み）
  // ---------------------------
  return (
    <div
      style={{
        backgroundColor: "#ffffff", // 画面全体を白に
        color: "#000000", // 文字色は黒
        minHeight: "100vh",
      }}
    >
      <main
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>
          管理画面（予約一覧）
        </h1>

        {loading && <p>読み込み中...</p>}
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

        {!loading && !fetchError && (
          <>
            {/* 在庫管理 */}
            <section
              style={{
                marginBottom: 24,
                padding: 16,
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fafafa",
              }}
            >
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>在庫管理</h2>
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                各商品の「残り在庫」を直接変更できます（最大は「総在庫」の値まで）。
              </p>

              {products.length === 0 ? (
                <p>商品データがありません。</p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  <thead style={{ background: "#f5f5f5" }}>
                    <tr>
                      <th style={thStyle}>商品名</th>
                      <th style={thStyle}>総在庫</th>
                      <th style={thStyle}>現在の残り在庫</th>
                      <th style={thStyle}>新しい残り在庫</th>
                      <th style={thStyle}>更新</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td style={tdStyle}>{p.name}</td>
                        <td style={tdStyle}>{p.stockTotal} セット</td>
                        <td style={tdStyle}>{p.stockRemaining} セット</td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min={0}
                            max={p.stockTotal}
                            value={stockEdits[p.id] ?? ""}
                            onChange={(e) =>
                              setStockEdits((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            style={{
                              width: 80,
                              padding: 4,
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              textAlign: "right",
                            }}
                          />{" "}
                          セット
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(p.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 16,
                              border: "none",
                              backgroundColor: "#f97316",
                              color: "#fff",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            更新
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {stockMessage && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
                  {stockMessage}
                </p>
              )}
            </section>

            {/* 集計 */}
            <section
              style={{
                marginBottom: 24,
                padding: 16,
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fafafa",
              }}
            >
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>まとめ</h2>
              <p>焼き餃子：{summary.yaki} セット</p>
              <p>クラフト餃子：{summary.craft} セット</p>
              <p>チーズ餃子：{summary.cheese} セット</p>
              <p style={{ marginTop: 8, fontWeight: 700 }}>
                合計売上：{summary.totalSales.toLocaleString()} 円
              </p>
            </section>

            {/* 予約一覧 */}
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>予約一覧</h2>
              {reservations.length === 0 ? (
                <p>まだ予約はありません。</p>
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead style={{ background: "#f5f5f5" }}>
                      <tr>
                        <th style={thStyle}>受け取り日時</th>
                        <th style={thStyle}>名前</th>
                        <th style={thStyle}>電話番号</th>
                        <th style={thStyle}>焼き</th>
                        <th style={thStyle}>クラフト</th>
                        <th style={thStyle}>チーズ</th>
                        <th style={thStyle}>合計金額</th>
                        <th style={thStyle}>予約ID</th>
                        <th style={thStyle}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((r) => (
                        <tr key={r.id}>
                          <td style={tdStyle}>
                            {r.pickupDate} {r.pickupTime}
                          </td>
                          <td style={tdStyle}>{r.name}</td>
                          <td style={tdStyle}>{r.phone}</td>
                          <td style={tdStyle}>{r.items?.yaki ?? 0}</td>
                          <td style={tdStyle}>{r.items?.craft ?? 0}</td>
                          <td style={tdStyle}>{r.items?.cheese ?? 0}</td>
                          <td style={tdStyle}>
                            {r.totalAmount?.toLocaleString()} 円
                          </td>
                          <td style={tdStyle}>{r.id}</td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => handleDeleteReservation(r)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 16,
                                border: "none",
                                backgroundColor: "#ef4444",
                                color: "#fff",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              キャンセル
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reservationMessage && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
                  {reservationMessage}
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
