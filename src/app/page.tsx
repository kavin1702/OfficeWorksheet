import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import { getWorksheetEntries, dbHealthCheck } from "./actions";
import WorksheetApp from "./WorksheetApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sessionResult = await validateSession();
  if (!sessionResult) {
    redirect("/login");
  }

  const [initialEntries, isDbConnected] = await Promise.all([
    getWorksheetEntries(),
    dbHealthCheck(),
  ]);

  return (
    <WorksheetApp
      initialEntries={initialEntries}
      isDbConnected={isDbConnected}
      currentUser={sessionResult.user}
    />
  );
}
