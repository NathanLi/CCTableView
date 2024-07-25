import UKTableViewCell from "../cell/UKTableViewCell";
import { EUKVerticalDirection } from "../EUKTableViewType";
import { IVisiableRect, uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

interface ILayoutPositionCal {
    getStartPos(content: cc.Node): number;
    getNextPos(curPos: number, side: number): number;
    setPos(node: cc.Node, pos: number, side: number): void;

    getStartOffset(): number;
    getNextOffset(curOffset: number, side: number): number;
    getOffset(content: cc.Node, curOffset: number): number;

    /** 是否超出可视边界 */
    isOver(curPos: number, visiableRect: IVisiableRect): boolean;
}

export class UKLayoutVertical extends UKLayout {
    private _positionCalT2B: ILayoutPositionCal = {
        getStartPos: (content) => uk.getContentTop(content) - this.paddingTop,
        getNextPos: (curPos, side) => curPos - side - this.spaceY,
        setPos: (node, pos, side) => uk.setYByTop(node, pos, side),

        getStartOffset: () => this.paddingTop,
        getNextOffset: (curOffset, side) => curOffset + side + this.spaceY,
        getOffset: (_, curOffset) => curOffset,

        isOver: (curPos, visiableRect) => curPos < visiableRect.bottom,
    };

    private _positionCalB2T: ILayoutPositionCal = {
        getStartPos: (content) => uk.getContentBottom(content) + this.paddingBottom,
        getNextPos: (curPos, side) => curPos + side + this.spaceY,
        setPos: (node, pos, side) => uk.setYByBottom(node, pos, side),

        getStartOffset: () => this.paddingBottom,
        getNextOffset: (curOffset, side) => curOffset + side + this.spaceY,
        getOffset: (content, curOffset) => content.height - curOffset,

        isOver: (curPos, visiableRect) => curPos > visiableRect.top,
    };

    private get posCal() {
        return  (this.dir == EUKVerticalDirection.TOP_TO_BOTTOM) ? this._positionCalT2B : this._positionCalB2T;
    }

    constructor(private dir: EUKVerticalDirection) {
        super();
    }

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
        let nextPos = this.posCal.getStartPos(content);

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
        const cal = this.posCal;

        let offset = cal.getStartOffset();
        let toIndex = eleIndex;

        for (let index = 0, times = 0; times < eleCount; ++times, index++) {
            if (index == toIndex) {
                break;
            }

            offset = cal.getNextOffset(offset, this.sizeAtIndex(index));
        }

        offset = cal.getOffset(scroll.content, offset);
        return cc.v2(scroll.getScrollOffset().x, offset);
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

            const top = Math.max(curPos, nextPos);
            const bottom = Math.min(curPos, nextPos);
            const isOut = (bottom > visiableRect.top) || (top < visiableRect.bottom);
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