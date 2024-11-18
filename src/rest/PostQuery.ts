import { IInsightFacade, InsightResult } from "../controller/IInsightFacade";

export default async function performPostQuery(facade: IInsightFacade, query: unknown): Promise<InsightResult[]> {
	return facade.performQuery(query);
}
