"use client";

import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
// ✅ 正しいパス
import { db } from "../../../../lib/firebase";



export default function CompletePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const id = searchParams.get("id");

  useEffect(() => {
    const load = async () => {
      // id が無いとき
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
          setReservation({
            id: snap.id,
            ...snap.data(),
          });
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

  // ここから画面表示 ------------------------

  if (loading) {
    return <div>読み込み中です...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>予約エラー</h1>
        <p>{error}</p>
        <button onClick={handleBackTop}>トップへ戻る</button>
      </div>
    );
  }

  // reservation に入っているデータの例：
  // 名前: reservation.name
  // 電話番号: reservation.phone
  // 受け取り時間: reservation.time など
  // （フィールド名は、今Firestoreに保存しているものに合わせてね）

  return (
    <div>
      <h1>予約が完了しました</h1>
      <p>予約ID: {reservation.id}</p>

      {/* 必要に応じて予約内容をここに表示 */}
      {reservation.name && <p>お名前: {reservation.name}</p>}
      {reservation.phone && <p>電話番号: {reservation.phone}</p>}
      {reservation.time && <p>受け取り時間: {reservation.time}</p>}

      <button onClick={handleBackTop} style={{ marginTop: "16px" }}>
        トップへ戻る
      </button>
    </div>
  );
}
