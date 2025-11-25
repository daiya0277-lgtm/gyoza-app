"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase"; // ← パス注意！

export default function CompletePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      const id = searchParams.get("id");

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
  }, [searchParams]);

  const handleBackTop = () => {
    router.push("/");
  };

  // ---------- スタイル（予約ページと同じ雰囲気になるように） ----------
  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px",
    backgroundColor: "#f3f4f6",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
  };

  const containerStyle = {
    maxWidth: "960px",
    margin: "0 auto",
  };

  const headerStyle = {
    marginBottom: "24px",
  };

  const titleStyle = {
    fontSize: "28px",
    fontWeight: 700,
    margin: 0,
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 15px 35px rgba(15, 23, 42, 0.12)",
    padding: "32px 32px 28px",
  };

  const badgeStyle = {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "rgba(16, 185, 129, 0.12)",
    color: "#059669",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "12px",
  };

  const mainHeadingStyle = {
    fontSize: "22px",
    fontWeight: 700,
    margin: "0 0 8px",
  };

  const subTextStyle = {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 24px",
  };

  const infoBoxStyle = {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "20px",
  };

  const infoRowStyle = {
    display: "flex",
    gap: "8px",
    fontSize: "14px",
    marginBottom: "4px",
  };

  const infoLabelStyle = {
    width: "80px",
    color: "#6b7280",
  };

  const infoValueStyle = {
    fontWeight: 500,
  };

  const idRowStyle = {
    fontSize: "13px",
    color: "#4b5563",
    marginBottom: "12px",
    wordBreak: "break-all",
  };

  const buttonRowStyle = {
    marginTop: "16px",
    display: "flex",
    gap: "12px",
  };

  const primaryButtonStyle = {
    padding: "10px 20px",
    borderRadius: "999px",
    border: "none",
    background:
      "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(248, 113, 22, 0.35)",
  };

  const secondaryTextStyle = {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "8px",
  };

  const errorTextStyle = {
    color: "#b91c1c",
    fontWeight: 600,
    marginBottom: "12px",
  };

  // ---------- 画面描画 ----------

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>ゼミ餃子予約サイト</h1>
          </div>
          <div style={cardStyle}>
            <p>読み込み中です…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>ゼミ餃子予約サイト</h1>
          </div>
          <div style={cardStyle}>
            <div style={badgeStyle}>エラー</div>
            <h2 style={mainHeadingStyle}>予約情報の取得に失敗しました</h2>
            <p style={errorTextStyle}>{error ?? "不明なエラーが発生しました。"}</p>
            <p style={subTextStyle}>
              お手数ですが、もう一度トップページから予約し直してください。
            </p>

            <div style={buttonRowStyle}>
              <button type="button" onClick={handleBackTop} style={primaryButtonStyle}>
                トップページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 正常系
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>ゼミ餃子予約サイト</h1>
        </div>

        <div style={cardStyle}>
          <span style={badgeStyle}>予約完了</span>
          <h2 style={mainHeadingStyle}>ご予約ありがとうございます</h2>
          <p style={subTextStyle}>
            以下の内容で予約を受け付けました。当日、受け取り場所でこの画面（または予約ID）を提示してください。
          </p>

          <div style={idRowStyle}>
            <strong>予約ID：</strong>
            {reservation.id}
          </div>

          <div style={infoBoxStyle}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>お名前</span>
              <span style={infoValueStyle}>{reservation.name || "ー"}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>電話番号</span>
              <span style={infoValueStyle}>{reservation.phone || "ー"}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>受け取り時間</span>
              <span style={infoValueStyle}>{reservation.time || "ー"}</span>
            </div>
            {/* 必要なら他のフィールドもここに追加 */}
          </div>

          <div style={buttonRowStyle}>
            <button type="button" onClick={handleBackTop} style={primaryButtonStyle}>
              トップページに戻る
            </button>
          </div>

          <p style={secondaryTextStyle}>
            ※予約内容の変更が必要な場合は、ゼミ担当者まで直接連絡してください。
          </p>
        </div>
      </div>
    </div>
  );
}
