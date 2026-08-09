// 로또 공식 번호대 색상
function ballColor(n: number): string {
  if (n <= 10) return "#FBC400";
  if (n <= 20) return "#69C8F2";
  if (n <= 30) return "#FF7272";
  if (n <= 40) return "#AAAAAA";
  return "#B0D840";
}

/** 로또 번호 공 하나 */
export function LottoBall({
  n,
  size = 38,
  dim,
}: {
  n: number;
  size?: number;
  dim?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ballColor(n),
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: size * 0.42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.28 : 1,
      }}
    >
      {n}
    </div>
  );
}

/** 로또 번호 공 목록. bonus 가 있으면 뒤에 + 구분자와 함께 붙여요. */
export function LottoBalls({
  numbers,
  bonus,
  size,
  dim,
}: {
  numbers: number[];
  bonus?: number;
  size?: number;
  dim?: (n: number) => boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {numbers.map((n) => (
        <LottoBall key={n} n={n} size={size} dim={dim?.(n)} />
      ))}
      {bonus != null && (
        <>
          <span style={{ fontSize: 18, opacity: 0.5 }}>+</span>
          <LottoBall n={bonus} size={size} dim={dim?.(bonus)} />
        </>
      )}
    </div>
  );
}
