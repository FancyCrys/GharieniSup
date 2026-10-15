import { uploadsEnabled } from "@/lib/files";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default function Page() {
  return <SubmitForm uploads={uploadsEnabled()} />;
}
