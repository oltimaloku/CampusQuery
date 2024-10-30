import { ChildNode } from "parse5/dist/tree-adapters/default";

export function findTableWithClass(node: any, className: string): any {
	if (
		node.nodeName === "table" &&
		node.attrs?.some((attr: any) => attr.name === "class" && attr.value.includes(className))
	) {
		return node;
	}

	if (node.childNodes) {
		for (const child of node.childNodes) {
			const result = findTableWithClass(child, className);
			if (result) {
				return result;
			}
		}
	}

	return null;
}

export function getTableCells(row: ChildNode): ChildNode[] {
	const cells: ChildNode[] = [];
	if ("childNodes" in row) {
		for (const child of row.childNodes) {
			if (child.nodeName === "td") {
				cells.push(child);
			}
		}
	}
	return cells;
}

export function getTextContent(node: ChildNode): string {
	let text = "";

	if ("childNodes" in node) {
		for (const child of node.childNodes) {
			if (child.nodeName === "#text" && "value" in child) {
				text += child.value.trim() + " ";
			}
		}
	}
	return text.trim();
}

export function getHrefFromLink(node: ChildNode): string {
	if ("childNodes" in node) {
		for (const child of node.childNodes) {
			if (child.nodeName === "a" && child.attrs) {
				const href = child.attrs.find((attr) => attr.name === "href")?.value;
				if (href) {
					return href;
				}
			}
		}
	}
	return "";
}

export function getLinkText(node: ChildNode): string {
	let text = "";

	if ("childNodes" in node) {
		for (const child of node.childNodes) {
			if (child.nodeName === "a" && "childNodes" in child) {
				for (const linkChild of child.childNodes) {
					if (linkChild.nodeName === "#text" && "value" in linkChild) {
						text += linkChild.value.trim() + " ";
					}
				}
			}
		}
	}

	return text.trim();
}

export function getBuildingTable(nodes: ChildNode[]): ChildNode | null {
	for (const node of nodes) {
		// Check if the node has children
		if ("childNodes" in node) {
			if (node.nodeName === "table") {
				return node;
			}
			// Search children recursively
			const result = getBuildingTable(node.childNodes);
			if (result) {
				return result;
			}
		}
	}
	return null;
}

export function getBuildingRows(buildingTable: ChildNode): ChildNode[] {
	const rows: ChildNode[] = [];
	if ("childNodes" in buildingTable) {
		for (const node of buildingTable.childNodes) {
			if (node.nodeName === "tbody" && "childNodes" in node) {
				for (const child of node.childNodes) {
					if (child.nodeName === "tr") {
						const cells = getTableCells(child);
						if (cells.some((cell: ChildNode) => isBuildingRow(cell))) {
							rows.push(child);
						}
					}
				}
			}
		}
	}
	return rows;
}

export function isBuildingRow(cell: ChildNode): boolean {
	if ("attrs" in cell) {
		for (const attr of cell.attrs) {
			if (attr.name === "class" && attr.value.includes("views-field-field-building-code")) {
				return true;
			}
		}
	}
	return false;
}

export function getRoomRows(roomsTable: ChildNode): ChildNode[] {
	const rows: ChildNode[] = [];
	if ("childNodes" in roomsTable) {
		for (const node of roomsTable.childNodes) {
			if (node.nodeName === "tbody" && "childNodes" in node) {
				for (const child of node.childNodes) {
					if (child.nodeName === "tr") {
						rows.push(child);
					}
				}
			}
		}
	}
	return rows;
}
