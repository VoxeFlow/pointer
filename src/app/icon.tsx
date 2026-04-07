import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 16% 16%, rgba(212,173,91,0.95) 0 8%, rgba(212,173,91,0.18) 9%, transparent 15%), linear-gradient(135deg, #111111 0%, #050505 100%)",
          color: "white",
          fontSize: 180,
          fontWeight: 800,
          borderRadius: 120,
        }}
      >
        P
      </div>
    ),
    size,
  );
}
