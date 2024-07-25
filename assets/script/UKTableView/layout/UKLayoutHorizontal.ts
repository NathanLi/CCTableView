import UKTableViewCell from "../cell/UKTableViewCell";
import { IVisiableRect, uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

interface ILayoutPositionCal {
    getStartPos(content: cc.Node): number;
    getNextPos(curPos: number, side: number): number;
    setPos(node: cc.Node, pos: number, side: number): void;

    getStartOffset(): number;
    getNextOffset(curOffset: number, index: number, side: number): number;
    getOffset(content: cc.Node, curOffset: number): number;

    /** 是否超出可视边界 */
    isOver(curPos: number, visiableRect: IVisiableRect): boolean;
}


export class UKLayoutHorizontal extends UKLayout {
    private _positionCalL2R: ILayoutPositionCal = {
        getStartPos: (content) => uk.getContentLeft(content) + this.paddingLeft,
        getNextPos: (curPos, side) => curPos + side + this.spaceX,
        setPos: (node, pos, side) => uk.setXByLeft(node, pos, side),

        getStartOffset: () => this.paddingLeft,
        getNextOffset: (curOffset, index, side) => curOffset + side + this.spaceX,
        getOffset: (_, curOffset) => curOffset,

        isOver: (curPos, visiableRect) => curPos > visiableRect.right,
    };

    private _positionCalR2L: ILayoutPositionCal = {
        getStartPos: (content) => uk.getContentRight(content) - this.paddingRight,
        getNextPos: (curPos, side) => curPos - side - this.spaceX,
        setPos: (node, pos, side) => uk.setXByRight(node, pos, side),

        getStartOffset: () => this.paddingRight,
        getNextOffset: (curOffset, index, side) => curOffset + side + (index > 0 ? this.spaceX : 0),
        getOffset: (content, curOffset) => content.width - curOffset,

        isOver: (curPos, visiableRect) => curPos < visiableRect.left,
    };

    protected isLeftToRight = true;

    private get posCal() {
        return  (this.isLeftToRight) ? this._positionCalL2R : this._positionCalR2L;
    }

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

        const posCal = this.posCal;

        let layoutCount = 0;
        let nextPos = posCal.getStartPos(content);
        for (let index = 0, times = 0; times < count; ++times, index++) {
            const curPos = nextPos;
            const side = this.sizeAtIndex(index);
            
            nextPos = this.posCal.getNextPos(curPos, side);
            
            const node = mapNodes[index];
            if (!node) {
                continue;
            }

            this.posCal.setPos(node, curPos, side);

            if ((++layoutCount) == cellCount) {
                break;
            }
        }
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset: boolean): void {
        // const originOffset = scroll.getScrollOffset();
        // const originSide = scroll.content.width;
        const side = this.calContentSize(count);
        this.setSide(scroll.content, side);

        // if (!fixOffset) {
        //     return;
        // }

        // if (this.isLeftToRight) {
        //     // left to right 直接是原 offset
        //     scroll.scrollToOffset(originOffset);
        //     return;
        // }

        // if (originOffset.x < 0) {
        //     scroll.scrollToPercentHorizontal(0);
        //     return;
        // }

        // const scrollWidth = scroll.node.width;
        // if (side < scrollWidth) {
        //     scroll.scrollToPercentHorizontal(0);
        //     return;
        // }

        // const diff = side - Math.max(scrollWidth, originSide);
        // const offset = cc.v2(originOffset.x + diff, originOffset.y);
        // scroll.scrollToOffset(offset);
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
        const cal = this.posCal;

        let offset = cal.getStartOffset();

        for (let index = 0; index < eleCount; index++) {
            if (index == eleIndex) {
                break;
            }

            offset = cal.getNextOffset(offset, index, this.sizeAtIndex(index));
        }

        offset = cal.getOffset(scroll.content, offset);
        return cc.v2(offset, scroll.getScrollOffset().y);
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

        const cal = this.posCal;

        let showedIndexs = showedCells.map(c => c.index);
        let nextPos = cal.getStartPos(content);
        for (let index = 0, times = 0; times < eleCount; ++times, index++) {
            const curPos = nextPos;
            const side = this.sizeAtIndex(index);

            nextPos = cal.getNextPos(curPos, side);

            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const left = Math.min(curPos, nextPos);
            const right = Math.max(curPos, nextPos);
            const isOut = (left > visiableRect.right) || (right < visiableRect.left);
            const visiable = !isOut;
            if (visiable) {
                const cell = this.insertOneCellAt(content, index);
                const node = cell.node;

                cal.setPos(node, curPos, side);
            }

            if (cal.isOver(nextPos, visiableRect)) {
                break; 
            }
        }
    }

}