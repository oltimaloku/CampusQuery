import { IInsightFacade, InsightDataset } from "../controller/IInsightFacade";

export async function performGetDatasets(facade: IInsightFacade): Promise<InsightDataset[]> {
	return facade.listDatasets();
}
