import { Context } from "mocha";
import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let emptyZip: string;
	let courseNotInCourses: string;
	let minimalExample: string;
	let noCoursesFolder: string;
	let oneCourseNoSection: string;
	let emptyCoursesFolder: string;
	let oneCourseOneSection: string;
	let noAudit: string;
	let noAvg: string;
	let noCourse: string;
	let noFail: string;
	let noId: string;
	let noPass: string;
	let noProf: string;
	let noSubj: string;
	let noTitle: string;
	let noYear: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		emptyZip = await getContentFromArchives("empty_zip.zip");
		courseNotInCourses = await getContentFromArchives("course_not_in_courses.zip");
		minimalExample = await getContentFromArchives("minimal_example.zip");
		noCoursesFolder = await getContentFromArchives("no_courses_folder.zip");
		oneCourseNoSection = await getContentFromArchives("one_course_no_sections.zip");
		emptyCoursesFolder = await getContentFromArchives("empty_courses_folder.zip");
		oneCourseOneSection = await getContentFromArchives("one_course_one_section.zip");
		noAudit = await getContentFromArchives("no_audit.zip");
		noAvg = await getContentFromArchives("no_avg.zip");
		noCourse = await getContentFromArchives("no_course.zip");
		noFail = await getContentFromArchives("no_fail.zip");
		noId = await getContentFromArchives("no_id.zip");
		noPass = await getContentFromArchives("no_pass.zip");
		noProf = await getContentFromArchives("no_prof.zip");
		noSubj = await getContentFromArchives("no_subj.zip");
		noTitle = await getContentFromArchives("no_title.zip");
		noYear = await getContentFromArchives("no_year.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with an empty dataset id", async function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore in dataset id", async function () {
			const result = facade.addDataset("a_b", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with only whitespace dataset id", async function () {
			const result = facade.addDataset(" ", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should successfully add a dataset", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject a duplicate id", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				})
				.then(
					async (_res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should reject Room Kind", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject empty zip content", function () {
			const result = facade.addDataset("ubc", emptyZip, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject course not in courses folder", function () {
			const result = facade.addDataset("ubc", courseNotInCourses, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with no courses folder in zip", function () {
			const result = facade.addDataset("ubc", noCoursesFolder, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should accept only one course with multiple sections", function () {
			const result = facade.addDataset("ubc", minimalExample, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject content with no courses", function () {
			const result = facade.addDataset("ubc", emptyCoursesFolder, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should accept only one course with one section", function () {
			const result = facade.addDataset("ubc", oneCourseOneSection, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject content with one course and no sections", function () {
			const result = facade.addDataset("ubc", oneCourseNoSection, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_audit", function () {
			const result = facade.addDataset("ubc", noAudit, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_avg", function () {
			const result = facade.addDataset("ubc", noAvg, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_course", function () {
			const result = facade.addDataset("ubc", noCourse, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_fail", function () {
			const result = facade.addDataset("ubc", noFail, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_id", function () {
			const result = facade.addDataset("ubc", noId, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_pass", function () {
			const result = facade.addDataset("ubc", noPass, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_prof", function () {
			const result = facade.addDataset("ubc", noProf, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_subj", function () {
			const result = facade.addDataset("ubc", noSubj, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_title", function () {
			const result = facade.addDataset("ubc", noTitle, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_year", function () {
			const result = facade.addDataset("ubc", noYear, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should fail removal with unpopulated dataset", function () {
			const result = facade.removeDataset("ubc");

			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should successfully remove the only dataset", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("ubc");
				})
				.then(async (res2) => {
					expect(res2).to.equal("ubc");
					return facade.listDatasets();
				})
				.then(
					(res3) => expect(res3).to.be.empty,
					async (_err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should return an error with empty id", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("");
				})
				.then(
					async (_res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should return an error with a whitespace id", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset(" ");
				})
				.then(
					async (_res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should fail to remove dataset with the wrong name", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("ubc2");
				})
				.then(
					async (_res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(NotFoundError)
				);
		});

		it("should successfully remove one of multiple datasets", async function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset("ubc2", oneCourseOneSection, InsightDatasetKind.Sections);
				})
				.then(async (res2) => {
					expect(res2).to.have.members(["ubc", "ubc2"]);
					return facade.removeDataset("ubc");
				})
				.then(async (res3) => {
					expect(res3).to.equal("ubc");
					return facade.listDatasets();
				})
				.then(
					(res4) => expect(res4).to.deep.equal([{ id: "ubc2", kind: InsightDatasetKind.Sections, numRows: 1 }]),
					async (_err) => Promise.reject(new Error("List did not succeed"))
				);
		});
	});

	describe("ListDatasets", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should list empty list", function () {
			const result = facade.listDatasets();

			return expect(result).to.be.empty;
		});

		it("should list singular item", async function () {
			return facade
				.addDataset("ubc", oneCourseOneSection, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.listDatasets();
				})
				.then(
					(res2) => expect(res2).to.deep.equal([{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 }]),
					async (_err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should list multiple items", async function () {
			return facade
				.addDataset("ubc", oneCourseOneSection, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset("ubc2", minimalExample, InsightDatasetKind.Sections);
				})
				.then(async (res2) => {
					expect(res2).to.have.members(["ubc", "ubc2"]);
					return facade.listDatasets();
				})
				.then(
					(res3) =>
						expect(res3).to.deep.equal([
							{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 },
							{ id: "ubc2", kind: InsightDatasetKind.Sections, numRows: 2 },
						]),
					async (_err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should list items after remove", async function () {
			return facade
				.addDataset("ubc", oneCourseOneSection, InsightDatasetKind.Sections)
				.then(async (res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
				})
				.then(async (res) => {
					expect(res).to.have.members(["ubc", "ubc2"]);
					return facade.removeDataset("ubc2");
				})
				.then(async (res2) => {
					expect(res2).to.equal("ubc2");
					return facade.listDatasets();
				})
				.then(
					(res3) => expect(res3).to.deep.equal([{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 }]),
					async (_err) => Promise.reject(new Error("List did not succeed"))
				);
		});
	});

	describe("PerformQuery", function () {
		function checkQuery(useDeepEquals: boolean) {
			return async function (this: Mocha.Context): Promise<void> {
				if (!this.test) {
					throw new Error(
						"Invalid call to checkQuery." +
							"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
							"Do not invoke the function directly."
					);
				}
				const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
				let result: InsightResult[];
				try {
					result = await facade.performQuery(input);
					if (errorExpected) {
						expect.fail("Should have thrown an error");
					} else {
						if (useDeepEquals) {
							expect(result).to.deep.equal(expected);
						} else {
							expect(result).to.have.deep.members(expected);
						}
					}
				} catch (err) {
					if (!errorExpected) {
						expect.fail(`performQuery threw unexpected error: ${err}`);
					}
					if (expected === "InsightError") {
						expect(err).to.be.instanceOf(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(err).to.be.instanceOf(ResultTooLargeError);
					} else if (expected === "NotFoundError") {
						expect(err).to.be.instanceOf(NotFoundError);
					} else {
						expect.fail(`performQuery threw unexpected error: ${err}`);
					}
				}
			};
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("sections2", oneCourseOneSection, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery(true));
		it("[invalid/invalid.json] Query missing WHERE", checkQuery(true));
		it("[invalid/non_object_query.json] Query not an object", checkQuery(true));
		it("[invalid/multiple_datasets.json] Query contains multiple datasets", checkQuery(true));
		it("[invalid/results_too_large.json] Query returns too many results", checkQuery(true));
		it("[invalid/no_options.json] Query with no options", checkQuery(true));
		it("[invalid/invalid_filter_format.json] Invalid filter format", checkQuery(true));
		it("[valid/return_no_results.json] return no results", checkQuery(true));
		it("[valid/simple_or.json] simple or", checkQuery(true));
		it("[valid/simple_and.json] simple and", checkQuery(true));
		it("[valid/success_no_filter.json] success no filter", checkQuery(true));
		it("[invalid/invalid_logic_comp.json] invalid logic comp", checkQuery(true));
		it("[invalid/mcomp_use_skey.json] mcomp use skey", checkQuery(true));
		it("[invalid/mcomp_use_string.json] mcomp use string", checkQuery(true));
		it("[invalid/scomp_middle_asterisk.json] middle asterisk", checkQuery(true));
		it("[valid/scomp_empty.json] empty scomp", checkQuery(true));
		it("[valid/two_asterisks_alone.json] two asterisks alone", checkQuery(true));

		it("[valid/valid_repeated_columns.json] valid_repeated_columns", checkQuery(true));
		it("[invalid/invalid_order_key_not_in_columns.json] invalid_order_key_not_in_columns", checkQuery(true));
		it("[valid/successful_mcomp_eq.json] successful_mcomp_eq", checkQuery(true));
		it("[valid/pre_wildcard_success.json] pre_wildcard_success", checkQuery(true));
		it("[valid/post_wildcard_success.json] post_wildcard_success", checkQuery(true));
		it("[valid/successful_mcomp_lt.json] successful_mcomp_lt", checkQuery(true));
		it("[valid/valid_all_possible_keys.json] valid_all_possible_keys", checkQuery(true));
		it("[invalid/invalid_empty_logic.json] invalid_empty_logic", checkQuery(true));
		it("[valid/valid_order_by_skey.json] valid_order_by_skey", checkQuery(true));
		it("[valid/no_wildcard_success.json] no_wildcard_success", checkQuery(true));
		it("[invalid/invalid_only_order.json] invalid_only_order", checkQuery(true));
		it("[invalid/scomp_use_mkey.json] scomp_use_mkey", checkQuery(true));
		it("[valid/not_basic_test.json] not_basic_test", checkQuery(true));
		it("[invalid/invalid_column_no_keys.json] invalid_column_no_keys", checkQuery(true));
		it("[invalid/invalid_not.json] invalid_not", checkQuery(true));
		it("[valid/double_wildcard_success.json] double_wildcard_success", checkQuery(true));
		it("[invalid/scomp_use_number.json] scomp_use_number", checkQuery(true));
		it("[invalid/invalid_multiple_underscore.json] invalid_multiple_underscore", checkQuery(true));
		it("[invalid/invalid_order_key_not_skey_mkey.json] invalid_order_key_not_skey_mkey", checkQuery(true));
		it("[invalid/invalid_order_ref_different_dataset.json] invalid_order_ref_different_dataset", checkQuery(true));
		it("[invalid/invalid_order_type.json] invalid_order_type", checkQuery(true));
		it("[valid/no_order.json] no_order", checkQuery(false));
		it("[valid/valid_order_with_ties.json] valid_order_with_ties", checkQuery(false));
	});
});
