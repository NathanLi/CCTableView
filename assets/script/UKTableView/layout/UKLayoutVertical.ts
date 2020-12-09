import UKTableViewCell from "../cell/UKTableViewCell";
import { uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

export class UKLayoutVertical extends UKLayout {
    protected isTopToBottom = true;
    
    constructor(isTopToBottom: boolean) {
        super();
        this.isTopToBottom = isTopToBottom;
    }

    doLayout(scroll: cc.ScrollView, count: number): void {
        const content = scroll.content;
        
        const [visiableTop, visiableBottom] = uk.getVisiableVertical(scroll);
        if ((this._lastLayoutOffset !== undefined) && Math.abs(visiableTop - this._lastLayoutOffset) < Math.max(this.minDiff, 0.1)) {
            return;
        }
        
        this._lastLayoutOffset = visiableTop;
        
        const cells = this.getChildCells(content);
        this.doCycleCell(cells, visiableTop, visiableBottom);
        this.doFillCell(scroll, cells, count);
    }

    fixPositions(scroll: cc.ScrollView, count: number): void {
        if (scroll.content.childrenCount <= 0) {
            return;
        }

        this._lastLayoutOffset = undefined;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        
        const mapNodes: {[index: number]: cc.Node} = {};
        cells.forEach(cell => mapNodes[cell.index] = cell.node);

        const length = cells.length;
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

            if ((++layoutCount) == length) {
                break;
            }
        }
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

    private doCycleCell(cells: UKTableViewCell[], visiableTop: number, visiableBottom: number) {
        cells.forEach(cell => {
            const child = cell.node;
            const bottom = uk.getBottom(child);
            const top = bottom + child.height;
            const isOut = (top < (visiableBottom - 1)) || (bottom > (visiableTop + 1));
            if (isOut) {
                this.recyleCell(cell);
            }
        });
    }

    private doFillCell(scroll: cc.ScrollView, showedCells: UKTableViewCell[], eleCount: number) {
        const [visiableTop, visiableBottom] = uk.getVisiableVertical(scroll);
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

            const isOut = (curBottom >= visiableTop) || (curTop <= visiableBottom);
            const visiable = !isOut;
            if (visiable) {
                const cell = this.insertOneCellAt(content, index, side);
                const node = cell.node;

                uk.setYByTop(node, curTop, side);
            }

            if (nextTop < visiableBottom) {
                break; 
            }
        }
    }

    private getIteratorAugs(count: number) {
        let startIndex = 0;
        let sign = 1;
        if (!this.isTopToBottom) {
            startIndex = count - 1;
            sign = -1;
        }

        return [startIndex, sign];
    }

}