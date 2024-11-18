import { IInsightFacade } from "../controller/IInsightFacade";

export async function performGetDatasets(facade: IInsightFacade): Promise<string> {
    return JSON.stringify(facade.listDatasets());
}