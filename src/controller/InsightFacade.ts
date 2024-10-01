import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import SectionsDataset from "./SectionsDataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	datasets: Map<string, InsightDataset> = new Map<string, InsightDataset>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			if (!this.isValidId(id)) {
				throw new InsightError("Invalid id");
			}

			if (this.datasets.has(id)) {
				throw new InsightError("Dataset already exists");
			}

			if (kind === InsightDatasetKind.Sections) {
				const newSectionsDataset = new SectionsDataset(id, content);
			} else {
				throw new Error("Rooms dataset has not been implemented yet");
			}
		} catch (error) {
			throw new InsightError("Error adding dataset" + error);
		}

		throw new Error(
			`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		);
	}

	private isValidId(id: string): boolean {
		return /^[^_]+$/.test(id);
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
