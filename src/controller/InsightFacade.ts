import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult, InsightError } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(
			`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}

	public validateQuery(query: unknown): Boolean {
		// Recursive check if it is a filter
		let isFilter = function(obj: unknown): Boolean {
			return true;
		}

		// Check for {}
		let isEmpty = function(obj: unknown): Boolean {
			if ((typeof obj === "object") && (obj !== null)) {
				return (Object.keys(obj).length === 0)
			}
			return false;
		}

		let where: unknown = {};
		let options: unknown = {};
		// Check query has body and options
		if (typeof query == 'object' && query && "WHERE" in query && "OPTIONS" in query) {
			where = query.WHERE;
			options = query.OPTIONS;
		} else {
			return false;
		}
		// Validate where
		if (!isEmpty(where) && !isFilter(where)) {
			return false;
		}
		return true;
	}
}
