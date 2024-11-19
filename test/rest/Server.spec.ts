import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import { clearDisk } from "../TestUtil";
import fs from "fs-extra";

describe("Facade C3", function () {
	const port = 4321;
	const server = new Server(port);
	let sections: Buffer;
	let ubcSections: Buffer;
	before(async function () {
		server
			.start()
			.then(() => {
				Log.info("before tests - started");
			})
			.catch((err: Error) => {
				Log.error(`before tests - ERROR: ${err.message}`);
			});
		sections = await fs.readFile(`${__dirname}/../../test/resources/archives/pair.zip`);
		ubcSections = await fs.readFile(`${__dirname}/../../test/resources/archives/minimal_example.zip`);
		// TODO: start server here once and handle errors properly
	});

	after(async function () {
		server
			.stop()
			.then(() => {
				Log.info("after tests - stopped");
			})
			.catch((err: Error) => {
				Log.error(`after tests - ERROR: ${err.message}`);
			});
		await clearDisk();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		const SERVER_URL = `http://localhost:${port}`;
		const ENDPOINT_URL = "/dataset/sections/sections";
		const ZIP_FILE_DATA = sections;

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(StatusCodes.OK);
					expect(res.body).to.deep.equal({ result: ["sections"] });
				})
				.catch(function (err) {
					Log.error(err.message);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("PUT test for simple courses dataset", function () {
		const SERVER_URL = `http://localhost:${port}`;
		const ENDPOINT_URL = "/dataset/ubc/sections";

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ubcSections)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(StatusCodes.OK);
					expect(res.body).to.deep.equal({ result: ["ubc"] });
					return;
				})
				.catch(function (err) {
					Log.error(err.message);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
