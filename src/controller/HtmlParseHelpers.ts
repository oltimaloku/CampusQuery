import { ChildNode, Document } from "parse5/dist/tree-adapters/default";

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
			if (result) return result;
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
