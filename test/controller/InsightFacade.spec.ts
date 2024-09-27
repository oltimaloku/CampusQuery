import {
	IInsightFacade,
	InsightDataset,
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
	let empty_zip: string;
	let course_not_in_courses: string;
	let minimal_example: string;
	let no_courses_folder: string;
	let one_course_no_section: string;
	let empty_courses_folder: string;
	let one_course_one_section: string;
	let no_audit: string;
	let no_avg: string;
	let no_course: string;
	let no_fail: string;
	let no_id: string;
	let no_pass: string;
	let no_prof: string;
	let no_subj: string;
	let no_title: string;
	let no_year: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		empty_zip = await getContentFromArchives("empty_zip.zip");
		course_not_in_courses = await getContentFromArchives(
			"course_not_in_courses.zip"
		);
		minimal_example = await getContentFromArchives("minimal_example.zip");
		no_courses_folder = await getContentFromArchives("no_courses_folder.zip");
		one_course_no_section = await getContentFromArchives(
			"one_course_no_sections.zip"
		);
		empty_courses_folder = await getContentFromArchives(
			"empty_courses_folder.zip"
		);
		one_course_one_section = await getContentFromArchives(
			"one_course_one_section.zip"
		);
		no_audit = await getContentFromArchives("no_audit.zip");
		no_avg = await getContentFromArchives("no_avg.zip");
		no_course = await getContentFromArchives("no_course.zip");
		no_fail = await getContentFromArchives("no_fail.zip");
		no_id = await getContentFromArchives("no_id.zip");
		no_pass = await getContentFromArchives("no_pass.zip");
		no_prof = await getContentFromArchives("no_prof.zip");
		no_subj = await getContentFromArchives("no_subj.zip");
		no_title = await getContentFromArchives("no_title.zip");
		no_year = await getContentFromArchives("no_year.zip");

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
			const result = facade.addDataset(
				"",
				sections,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an underscore in dataset id", async function () {
			const result = facade.addDataset(
				"a_b",
				sections,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with only whitespace dataset id", async function () {
			const result = facade.addDataset(
				" ",
				sections,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should successfully add a dataset", function () {
			const result = facade.addDataset(
				"ubc",
				sections,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject a duplicate id", function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset(
						"ubc",
						sections,
						InsightDatasetKind.Sections
					);
				})
				.then(
					(res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should reject Room Kind", function () {
			const result = facade.addDataset(
				"ubc",
				sections,
				InsightDatasetKind.Rooms
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject empty zip content", function () {
			const result = facade.addDataset(
				"ubc",
				empty_zip,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject course not in courses folder", function () {
			const result = facade.addDataset(
				"ubc",
				course_not_in_courses,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with no courses folder in zip", function () {
			const result = facade.addDataset(
				"ubc",
				no_courses_folder,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should accept only one course with multiple sections", function () {
			const result = facade.addDataset(
				"ubc",
				minimal_example,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject content with no courses", function () {
			const result = facade.addDataset(
				"ubc",
				empty_courses_folder,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should accept only one course with one section", function () {
			const result = facade.addDataset(
				"ubc",
				one_course_one_section,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.have.members(["ubc"]);
		});

		it("should reject content with one course and no sections", function () {
			const result = facade.addDataset(
				"ubc",
				one_course_no_section,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_audit", function () {
			const result = facade.addDataset(
				"ubc",
				no_audit,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_avg", function () {
			const result = facade.addDataset(
				"ubc",
				no_avg,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_course", function () {
			const result = facade.addDataset(
				"ubc",
				no_course,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_fail", function () {
			const result = facade.addDataset(
				"ubc",
				no_fail,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_id", function () {
			const result = facade.addDataset(
				"ubc",
				no_id,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_pass", function () {
			const result = facade.addDataset(
				"ubc",
				no_pass,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_prof", function () {
			const result = facade.addDataset(
				"ubc",
				no_prof,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_subj", function () {
			const result = facade.addDataset(
				"ubc",
				no_subj,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_title", function () {
			const result = facade.addDataset(
				"ubc",
				no_title,
				InsightDatasetKind.Sections
			);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject content with no_year", function () {
			const result = facade.addDataset(
				"ubc",
				no_year,
				InsightDatasetKind.Sections
			);

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

		it("should successfully remove the only dataset", function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("ubc");
				})
				.then((res2) => {
					expect(res2).to.equal("ubc");
					return facade.listDatasets();
				})
				.then(
					(res3) => expect(res3).to.be.empty,
					(err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should return an error with empty id", function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("");
				})
				.then(
					(res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should return an error with a whitespace id", function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset(" ");
				})
				.then(
					(res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(InsightError)
				);
		});

		it("should fail to remove dataset with the wrong name", function () {
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.removeDataset("ubc2");
				})
				.then(
					(res2) => Promise.reject(new Error("Expected method to reject.")),
					(err) => expect(err).to.be.instanceOf(NotFoundError)
				);
		});

		it("should successfully remove one of multiple datasets", function () {
			let added: InsightDataset;
			added = { id: "ubc2", kind: InsightDatasetKind.Sections, numRows: 1 };
			return facade
				.addDataset("ubc", sections, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset(
						"ubc2",
						one_course_one_section,
						InsightDatasetKind.Sections
					);
				})
				.then((res2) => {
					expect(res2).to.have.members(["ubc", "ubc2"]);
					return facade.removeDataset("ubc");
				})
				.then((res3) => {
					expect(res3).to.equal("ubc");
					return facade.listDatasets();
				})
				.then(
					(res4) =>
						expect(res4).to.deep.equal([
							{ id: "ubc2", kind: InsightDatasetKind.Sections, numRows: 1 },
						]),
					(err) => Promise.reject(new Error("List did not succeed"))
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

		it("should list singular item", function () {
			return facade
				.addDataset("ubc", one_course_one_section, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.listDatasets();
				})
				.then(
					(res2) =>
						expect(res2).to.deep.equal([
							{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 },
						]),
					(err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should list multiple items", function () {
			return facade
				.addDataset("ubc", one_course_one_section, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset(
						"ubc2",
						minimal_example,
						InsightDatasetKind.Sections
					);
				})
				.then((res2) => {
					expect(res2).to.have.members(["ubc", "ubc2"]);
					return facade.listDatasets();
				})
				.then(
					(res3) =>
						expect(res3).to.deep.equal([
							{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 },
							{ id: "ubc2", kind: InsightDatasetKind.Sections, numRows: 2 },
						]),
					(err) => Promise.reject(new Error("List did not succeed"))
				);
		});

		it("should list items after remove", function () {
			return facade
				.addDataset("ubc", one_course_one_section, InsightDatasetKind.Sections)
				.then((res) => {
					expect(res).to.have.members(["ubc"]);
					return facade.addDataset(
						"ubc2",
						sections,
						InsightDatasetKind.Sections
					);
				})
				.then((res) => {
					expect(res).to.have.members(["ubc", "ubc2"]);
					return facade.removeDataset("ubc2");
				})
				.then((res2) => {
					expect(res2).to.equal("ubc2");
					return facade.listDatasets();
				})
				.then(
					(res3) =>
						expect(res3).to.deep.equal([
							{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 1 },
						]),
					(err) => Promise.reject(new Error("List did not succeed"))
				);
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context) {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(
				this.test.title
			);
			let result: InsightResult[];
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail("Should have thrown an error");
				} else {
					expect(result).to.deep.equal(expected);
				}
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected == "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected == "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else if (expected == "NotFoundError") {
					expect(err).to.be.instanceOf(NotFoundError);
				} else {
					// TODO: replace with your assertions
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset(
					"sections2",
					one_course_one_section,
					InsightDatasetKind.Sections
				),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(
					`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`
				);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/non_object_query.json] Query not an object", checkQuery);
		it(
			"[invalid/multiple_datasets.json] Query contains multiple datasets",
			checkQuery
		);
		it(
			"[invalid/results_too_large.json] Query returns too many results",
			checkQuery
		);
		it("[invalid/no_options.json] Query with no options", checkQuery);
		it(
			"[invalid/invalid_filter_format.json] Invalid filter format",
			checkQuery
		);
		it("[valid/return_no_results.json] return no results", checkQuery);
		it("[valid/simple_or.json] simple or", checkQuery);
		it("[valid/simple_and.json] simple and", checkQuery);
		it("[valid/success_no_filter.json] success no filter", checkQuery);
		it("[invalid/invalid_logic_comp.json] invalid logic comp", checkQuery);
		it("[invalid/mcomp_use_skey.json] mcomp use skey", checkQuery);
		it("[invalid/mcomp_use_string.json] mcomp use string", checkQuery);
		it("[invalid/scomp_middle_asterisk.json] middle asterisk", checkQuery);
		it("[valid/scomp_empty.json] empty scomp", checkQuery);
		it("[valid/two_asterisks_alone.json] two asterisks alone", checkQuery);

		it(
			"[valid/valid_repeated_columns.json] valid_repeated_columns",
			checkQuery
		);
		it(
			"[invalid/invalid_order_key_not_in_columns.json] invalid_order_key_not_in_columns",
			checkQuery
		);
		it("[valid/successful_mcomp_eq.json] successful_mcomp_eq", checkQuery);
		it("[valid/pre_wildcard_success.json] pre_wildcard_success", checkQuery);
		it("[valid/post_wildcard_success.json] post_wildcard_success", checkQuery);
		it("[valid/successful_mcomp_lt.json] successful_mcomp_lt", checkQuery);
		it(
			"[valid/valid_all_possible_keys.json] valid_all_possible_keys",
			checkQuery
		);
		it("[invalid/invalid_empty_logic.json] invalid_empty_logic", checkQuery);
		it("[valid/valid_order_by_skey.json] valid_order_by_skey", checkQuery);
		it("[valid/no_wildcard_success.json] no_wildcard_success", checkQuery);
		it("[invalid/invalid_only_order.json] invalid_only_order", checkQuery);
		it("[invalid/scomp_use_mkey.json] scomp_use_mkey", checkQuery);
		it("[valid/not_basic_test.json] not_basic_test", checkQuery);
		it(
			"[invalid/invalid_column_no_keys.json] invalid_column_no_keys",
			checkQuery
		);
		it("[invalid/invalid_not.json] invalid_not", checkQuery);
		it(
			"[valid/double_wildcard_success.json] double_wildcard_success",
			checkQuery
		);
		it("[invalid/scomp_use_number.json] scomp_use_number", checkQuery);
		it(
			"[invalid/invalid_multiple_underscore.json] invalid_multiple_underscore",
			checkQuery
		);
	});
});
