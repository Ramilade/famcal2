import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeStr } = await params;
  const size = Math.min(Math.max(parseInt(sizeStr) || 192, 16), 1024);
  const r = Math.round(size * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F7FEA",
          borderRadius: r,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: Math.round(size * 0.38),
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          FC
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
