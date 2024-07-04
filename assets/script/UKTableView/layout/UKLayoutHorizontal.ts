import UKTableViewCell from "../cell/UKTableViewCell";
import { IVisiableRect, uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

export class UKLayoutHorizontal extends UKLayout {
    protected isLeftToRight = true;

    constructor(isLeftToRight: boolean) {
        super();
        this.isLeftToRight = isLeftToRight;
    }

    doLayout(scroll: cc.ScrollView, count: number): void {
        const visiableRect = uk.getVisiable(scroll);
        if (!IVisiableRect.isMoved(this._lastLayoutRect, visiableRect, Math.max(this.minDiff, 0.1))) {
            return;
        }

        this._lastLayoutRect = visiableRect;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        this.doCycleCell(cells, visiableRect);

        if (this.isLeftToRight) {
            this.doFillCellLeft(scroll, cells, count);
        } else {
            this.doFillCell(scroll, cells, count);
        }
    }

    fixPositions(scroll: cc.ScrollView, count: number): void {
        if (scroll.content.childrenCount <= 0) {
            return;
        }

        this._lastLayoutRect = undefined;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        
        const mapNodes: {[index: number]: cc.Node} = {};
        cells.forEach(cell => mapNodes[cell.index] = cell.node);

        const length = cells.length;
        let layoutCount = 0;
        let [startIndex, sign] = this.getIteratorAugs(count);
        let nextRight = uk.getContentRight(content) - this.paddingRight;
        for (let index = startIndex, times = 0; times < count; ++times, index += sign) {
            const right = nextRight;
            const side = this.sizeAtIndex(index);
            const node = mapNodes[index];

            nextRight = right - side - this.spaceX;

            if (!node) {
                continue;
            }

            uk.setXByRight(node, right, side);

            layoutCount++;
            if (layoutCount == length) {
                break;
            }
        }
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset: boolean): void {
        const originOffset = scroll.getScrollOffset();
        const originSide = scroll.content.width;
        const side = this.calContentSize(count);
        this.setSide(scroll.content, side);

        if (!fixOffset) {
            return;
        }

        if (this.isLeftToRight) {
            // left to right 直接是原 offset
            scroll.scrollToOffset(originOffset);
            return;
        }

        if (originOffset.x < 0) {
            scroll.scrollToPercentHorizontal(0);
            return;
        }

        const scrollWidth = scroll.node.width;
        if (side < scrollWidth) {
            scroll.scrollToPercentHorizontal(0);
            return;
        }

        const diff = side - Math.max(scrollWidth, originSide);
        const offset = cc.v2(originOffset.x + diff, originOffset.y);
        scroll.scrollToOffset(offset);
    }

    getPaddingCount() {
        return this.paddingLeft + this.paddingRight;
    }

    getSpace() {
        return this.spaceX;
    }

    setSide(node: cc.Node, side: number): void {
        node.width = side;
    }

    getSide(node: cc.Node): number {
        return node.width;
    }

    getOffsetOfIndex(scroll: cc.ScrollView, eleIndex: number, eleCount: number) {
        let [startIndex, sign] = this.isLeftToRight ? [0, 1] : [eleCount - 1, -1];
        let left = 0 + this.paddingLeft;
        let toIndex = eleIndex;

        for (let index = startIndex, times = 0; times < eleCount; ++times, index += sign) {
            if (index == toIndex) {
                break;
            }

            left = left + this.sizeAtIndex(index) + this.spaceX;
        }

        let x = left;
        return cc.v2(x, scroll.getScrollOffset().y);
    }

    private doCycleCell(cells: UKTableViewCell[], visiable: IVisiableRect) {
        cells.forEach(cell => {
            if (uk.isOut(cell.node, visiable)) {
                this.recyleCell(cell);
            }
        });
    }

    private doFillCell(scroll: cc.ScrollView, showedCells: UKTableViewCell[], eleCount: number) {
        const visiableRect = uk.getVisiable(scroll);
        const content = scroll.content;

        let showedIndexs = showedCells.map(c => c.index);
        let nextRight = uk.getContentRight(content) - this.paddingRight;
        let [startIndex, sign] = this.getIteratorAugs(eleCount);
        for (let index = startIndex, times = 0; times < eleCount; ++times, index += sign) {
            const curRight = nextRight;
            const side = this.sizeAtIndex(index);
            const curLeft = curRight - side;

            nextRight = curLeft - this.spaceX;

            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const isOut = (curLeft >= visiableRect.right) || (curRight <= visiableRect.left);
            const visiable = !isOut;
            if (visiable) { 
                const cell = this.insertOneCellAt(content, index);
                const node = cell.node;

                uk.setXByRight(node, curRight, side);
            }

            if (nextRight < visiableRect.left) {
                break; 
            }
        }
    }

    private doFillCellLeft(scroll: cc.ScrollView, showedCells: UKTableViewCell[], eleCount: number) {
        const visiableRect = uk.getVisiable(scroll);
        const content = scroll.content;

        let showedIndexs = showedCells.map(c => c.index);
        let nextLeft = uk.getContentLeft(content) + this.paddingLeft;
        let [startIndex, sign] = this.getIteratorAugs(eleCount);
        for (let index = startIndex, times = 0; times < eleCount; ++times, index += sign) {
            const curLeft = nextLeft;
            const side = this.sizeAtIndex(index);
            const curRight = curLeft + side;

            nextLeft = curRight + this.spaceX;

            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const isOut = (curLeft >= visiableRect.right) || (curRight <= visiableRect.left);
            const visiable = !isOut;
            if (visiable) { 
                const cell = this.insertOneCellAt(content, index);
                const node = cell.node;

                uk.setXByLeft(node, curLeft, side);
            }

            if (nextLeft > visiableRect.right) {
                break; 
            }
        }
    }

    private getIteratorAugs(count: number) {
        let startIndex = 0;
        let sign = 1;
        if (this.isLeftToRight) {
            startIndex = count - 1;
            sign = -1;
        }

        return [startIndex, sign];
    }
}