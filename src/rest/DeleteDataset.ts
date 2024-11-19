import { IInsightFacade } from "../controller/IInsightFacade";

export async function performDeleteDataset(facade: IInsightFacade, id: string): Promise<string> {
	return facade.removeDataset(id);
}
