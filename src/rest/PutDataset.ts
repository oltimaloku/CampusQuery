import { IInsightFacade, InsightDatasetKind } from "../controller/IInsightFacade";

export async function performPutDataset(
	facade: IInsightFacade,
	id: string,
	kind: string,
	content: string
): Promise<string[]> {
	return facade.addDataset(id, content, kind as InsightDatasetKind);
}
