import UKTableViewCell from "../cell/UKTableViewCell";
import { IVisiableRect, uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

export class UKLayoutVertical extends UKLayout {
    doLayout(scroll: cc.ScrollView, count: number): void {
        const visiable = uk.getVisiable(scroll);
        if (!IVisiableRect.isMoved(this._lastLayoutRect, visiable, Math.max(this.minDiff, 0.1))) {
            return;
        }

        this._lastLayoutRect = visiable;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        this.doCycleCell(cells, visiable);
        this.doFillCell(scroll, cells, count);
    }

    fixPositions(scroll: cc.ScrollView, count: number): void {
        if (scroll.content.childrenCount <= 0) {
            return;
        }

        this._lastLayoutRect = undefined;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        const cellCount = cells.length;
        
        const mapNodes: {[index: number]: cc.Node} = {};
        cells.forEach(cell => mapNodes[cell.index] = cell.node);

        let layoutCount = 0;
        let nextTop = uk.getContentTop(content) - this.paddingTop;
        let [startIndex, sign] = this.getIteratorAugs(count);

        for (let index = startIndex, times = 0; times < count; ++times, index += sign) {
            const curTop = nextTop;
            const side = this.sizeAtIndex(index);
            const curBottom = curTop - side;
            const node = mapNodes[index];

            nextTop = curBottom - this.spaceY;

            if (!node) {
                continue;
            }

            uk.setYByTop(node, curTop, side);

            if ((++layoutCount) == cellCount) {
                break;
            }
        }
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset: boolean = false): void {
        const side = this.calContentSize(count);
        this.setSide(scroll.content, side);
    }

    getPaddingCount() {
        return this.paddingTop + this.paddingBottom;
    }

    getSpace() {
        return this.spaceY;
    }

    setSide(node: cc.Node, side: number): void {
        node.height = side;
    }

    getSide(node: cc.Node): number {
        return node.height;
    }

    getOffsetOfIndex(scroll: cc.ScrollView, eleIndex: number, eleCount: number) {
        let [startIndex, sign] = this.getIteratorAugs(eleCount);
        let top = 0 + this.paddingTop;
        let toIndex = eleIndex;

        for (let index = startIndex, times = 0; times < eleCount; ++times, index += sign) {
            if (index == toIndex) {
                break;
            }

            top = top + this.sizeAtIndex(index) + this.spaceY;
        }

        let y = top;
        return cc.v2(scroll.getScrollOffset().x, y);
    }

    private doCycleCell(cells: UKTableViewCell[], visiableRect: IVisiableRect) {
        cells.forEach(cell => {
            if (uk.isOut(cell.node, visiableRect)) {
                this.recyleCell(cell);
            }
        });
    }

    private doFillCell(scroll: cc.ScrollView, showedCells: UKTableViewCell[], eleCount: number) {
        const visiableRect = uk.getVisiable(scroll);
        const content = scroll.content;

        let showedIndexs = showedCells.map(c => c.index);
        let nextTop = uk.getContentTop(content) - this.paddingTop;
        let [startIndex, sign] = this.getIteratorAugs(eleCount);
        for (let index = startIndex, times = 0; times < eleCount; ++times, index += sign) {
            const curTop = nextTop;
            const side = this.sizeAtIndex(index);
            const curBottom = curTop - side;

            nextTop = curBottom - this.spaceY;
            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const isOut = (curBottom >= visiableRect.top) || (curTop <= visiableRect.bottom);
            const visiable = !isOut;
            if (visiable) {
                const cell = this.insertOneCellAt(content, index);
                const node = cell.node;

                uk.setYByTop(node, curTop, side);
            }

            if (nextTop < visiableRect.bottom) {
                break; 
            }
        }
    }

    private getIteratorAugs(count: number) {
        let startIndex = 0;
        let sign = 1;

        return [startIndex, sign];
    }

}