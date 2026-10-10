import "server-only";
import QRCode from "qrcode";

export function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0A0A0B", light: "#F5F5F2" },
  });
}
