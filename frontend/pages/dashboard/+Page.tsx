import { DashboardHome } from "../../apps/dashboard";
import { useAuthedUser } from "../../apps/auth";

export { Page };

// The admin shell + auth gate live in the persistent RootLayout; the page just
// renders its content and reads the resolved user from context.
function Page() {
  return <DashboardHome user={useAuthedUser()} />;
}
