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
    let facade: InsightFacade;

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

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkValidateQuery(this: Mocha.Context) {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkValidateQuery." +
						"Usage: 'checkValidateQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: Boolean;
			try {
				result = facade.validateQuery(input);
				if (errorExpected) {
					expect(result).to.be.false;
				} else {
					expect(result).to.be.true;
				}
			} catch (err) {
				expect.fail(`validateQuery threw unexpected error: ${err}`);
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
            /*
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("sections2", oneCourseOneSection, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
            */
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkValidateQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkValidateQuery);
		it("[invalid/non_object_query.json] Query not an object", checkValidateQuery);
		it("[invalid/multiple_datasets.json] Query contains multiple datasets", checkValidateQuery);
		//it("[invalid/results_too_large.json] Query returns too many results", checkValidateQuery);
		it("[invalid/no_options.json] Query with no options", checkValidateQuery);
		it("[invalid/invalid_filter_format.json] Invalid filter format", checkValidateQuery);
		it("[valid/return_no_results.json] return no results", checkValidateQuery);
		it("[valid/simple_or.json] simple or", checkValidateQuery);
		it("[valid/simple_and.json] simple and", checkValidateQuery);
		it("[valid/success_no_filter.json] success no filter", checkValidateQuery);
		it("[invalid/invalid_logic_comp.json] invalid logic comp", checkValidateQuery);
		it("[invalid/mcomp_use_skey.json] mcomp use skey", checkValidateQuery);
		it("[invalid/mcomp_use_string.json] mcomp use string", checkValidateQuery);
		it("[invalid/scomp_middle_asterisk.json] middle asterisk", checkValidateQuery);
		it("[valid/scomp_empty.json] empty scomp", checkValidateQuery);
		it("[valid/two_asterisks_alone.json] two asterisks alone", checkValidateQuery);

		it("[valid/valid_repeated_columns.json] valid_repeated_columns", checkValidateQuery);
		it("[invalid/invalid_order_key_not_in_columns.json] invalid_order_key_not_in_columns", checkValidateQuery);
		it("[valid/successful_mcomp_eq.json] successful_mcomp_eq", checkValidateQuery);
		it("[valid/pre_wildcard_success.json] pre_wildcard_success", checkValidateQuery);
		it("[valid/post_wildcard_success.json] post_wildcard_success", checkValidateQuery);
		it("[valid/successful_mcomp_lt.json] successful_mcomp_lt", checkValidateQuery);
		it("[valid/valid_all_possible_keys.json] valid_all_possible_keys", checkValidateQuery);
		it("[invalid/invalid_empty_logic.json] invalid_empty_logic", checkValidateQuery);
		it("[valid/valid_order_by_skey.json] valid_order_by_skey", checkValidateQuery);
		it("[valid/no_wildcard_success.json] no_wildcard_success", checkValidateQuery);
		it("[invalid/invalid_only_order.json] invalid_only_order", checkValidateQuery);
		it("[invalid/scomp_use_mkey.json] scomp_use_mkey", checkValidateQuery);
		it("[valid/not_basic_test.json] not_basic_test", checkValidateQuery);
		it("[invalid/invalid_column_no_keys.json] invalid_column_no_keys", checkValidateQuery);
		it("[invalid/invalid_not.json] invalid_not", checkValidateQuery);
		it("[valid/double_wildcard_success.json] double_wildcard_success", checkValidateQuery);
		it("[invalid/scomp_use_number.json] scomp_use_number", checkValidateQuery);
		it("[invalid/invalid_multiple_underscore.json] invalid_multiple_underscore", checkValidateQuery);
	});
});