import { MembersView } from "../../apps/users";
import { useAuthedUser } from "../../apps/auth";

export { Page };

function Page() {
  return <MembersView currentUser={useAuthedUser()} />;
}
