import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, loadTestQuery } from "../TestUtil";
import { validateQuery } from "../../src/controller/ValidationHelpers";

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

	before(async function () {
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("PerformQuery", function () {
		async function checkValidateQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error("Invalid call to checkValidateQuery.");
			}
			// Destructuring assignment to reduce property accesses
			const { input, errorExpected } = await loadTestQuery(this.test.title);
			let result: Boolean;
			try {
				result = validateQuery(input);
				if (errorExpected) {
					expect(result).to.equal(false);
				} else {
					expect(result).to.equal(true);
				}
			} catch (err) {
				expect.fail(`validateQuery threw unexpected error: ${err}`);
			}
		}

		before(async function () {
			facade = new InsightFacade();
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
        it("[onlyEBNF/cols_not_in_group.json] cols_not_in_group", checkValidateQuery);
	});
});