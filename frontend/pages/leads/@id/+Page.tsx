import { usePageContext } from "../../../renderer/usePageContext";
import { LeadDetailView } from "../../../apps/leads";

export { Page };

function Page() {
  const { routeParams } = usePageContext();
  return <LeadDetailView id={Number(routeParams.id)} />;
}
