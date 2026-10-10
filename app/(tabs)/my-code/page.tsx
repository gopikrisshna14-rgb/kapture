import { requireUser } from "@/lib/server-page";
import { qrSvg } from "@/lib/qr";
import { baseUrl } from "@/lib/base-url";
import { MyCode } from "./my-code";

export default async function MyCodePage() {
  const { profile } = await requireUser();
  const catchUrl = profile.handle ? `${await baseUrl()}/c/${profile.handle}` : null;
  return (
    <MyCode
      name={profile.display_name}
      catchUrl={catchUrl}
      catchSvg={catchUrl ? await qrSvg(catchUrl) : null}
      linkedinUrl={profile.linkedin_url}
      linkedinSvg={profile.linkedin_url ? await qrSvg(profile.linkedin_url) : null}
    />
  );
}
