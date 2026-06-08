import { AccountSettings, useAuthedUser } from "../../apps/auth";

export { Page };

function Page() {
  return <AccountSettings user={useAuthedUser()} />;
}
