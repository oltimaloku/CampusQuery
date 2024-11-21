import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import * as http from "http";
import cors from "cors";
import { IInsightFacade, NotFoundError } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
import { performGetDatasets } from "./GetDatasets";
import { performPutDataset } from "./PutDataset";
import { performDeleteDataset } from "./DeleteDataset";
import performPostQuery from "./PostQuery";
import ReviewManager from "../controller/ReviewManager";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private facade: IInsightFacade;
	private reviewManager: ReviewManager;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.facade = new InsightFacade();
		this.reviewManager = ReviewManager.getInstance();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware(): void {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes(): void {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		this.express.get("/datasets", (req, res) => {
			this.getDatasets(req, res);
		});
		this.express.put("/dataset/:id/:kind", (req, res) => {
			this.putDataset(req, res);
		});
		this.express.delete("/dataset/:id", (req, res) => {
			this.deleteDataset(req, res);
		});
		this.express.post("/query/", (req, res) => {
			this.postQuery(req, res);
		});

		this.express.get("/review/:roomName", (req, res) => {
			this.getReview(req, res);
		});

		this.express.post("/review/:roomName/:review", (req, res) => {
			this.updateReview(req, res);
		});
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response): void {
		try {
			Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private getDatasets(_req: Request, res: Response): void {
		Log.info(`Server::datasets`);
		performGetDatasets(this.facade)
			.then((value) => {
				res.status(StatusCodes.OK).json({ result: value });
			})
			.catch((err) => {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
			});
	}

	private putDataset(req: Request, res: Response): void {
		Log.info(`Server::putDataset(..) - params: ${JSON.stringify(req.params)}`);
		performPutDataset(this.facade, req.params.id, req.params.kind, req.body.toString("base64"))
			.then((value) => {
				res.status(StatusCodes.OK).json({ result: value });
			})
			.catch((err) => {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
			});
	}

	private deleteDataset(req: Request, res: Response): void {
		Log.info(`Server::deleteDataset(..) - params: ${JSON.stringify(req.params)}`);
		performDeleteDataset(this.facade, req.params.id)
			.then((value) => {
				res.status(StatusCodes.OK).json({ result: value });
			})
			.catch((err) => {
				if (err instanceof NotFoundError) {
					res.status(StatusCodes.NOT_FOUND).json({ error: err.message });
				} else {
					res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
				}
			});
	}

	private postQuery(req: Request, res: Response): void {
		Log.info(`Server::postQuery(..) - params: ${JSON.stringify(req.params)}`);
		performPostQuery(this.facade, req.body)
			.then((value) => {
				res.status(StatusCodes.OK).json({ result: value });
			})
			.catch((err) => {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err.message });
			});
	}

	private async getReview(req: Request, res: Response): Promise<void> {
		Log.info(`Server::postQuery(..) - params: ${JSON.stringify(req.params)}`);
		try {
			const roomName = req.params.roomName;

			// Ensure reviews are loaded
			await this.reviewManager.loadRoomReviews();

			const review = this.reviewManager.getReview(roomName);
			res.status(StatusCodes.OK).json({ result: review });
		} catch (err) {
			if (err instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: err.message });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err });
			}
		}
	}

	private async updateReview(req: Request, res: Response): Promise<void> {
		Log.info(`Server::postQuery(..) - params: ${JSON.stringify(req.params)}`);
		try {
			const roomName = req.params.roomName;
			const reviewString = req.params.review;

			const review = Number(reviewString);

			if (isNaN(review) || review < 0 || review > 5) {
				throw new Error("Review must be a valid number between 0 and 5");
			}

			await this.reviewManager.loadRoomReviews();

			this.reviewManager.updateReview(roomName, review);

			await this.reviewManager.saveRoomReviews();

			res.status(StatusCodes.OK).json({ result: "Review updated successfully" });
		} catch (err) {
			if (err instanceof NotFoundError) {
				res.status(StatusCodes.NOT_FOUND).json({ error: err.message });
			} else {
				res.status(StatusCodes.BAD_REQUEST).json({ error: err });
			}
		}
	}
}
