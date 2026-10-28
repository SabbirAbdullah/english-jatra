import { getUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { AdminWordForm } from "@/components/AdminWordForm";
export default async function Page() {
  const { sb } = await getUser();
  return (<div className="space-y-4"><h1 className="h1">New word</h1><AdminWordForm categories={await getCategories(sb)} /></div>);
}
