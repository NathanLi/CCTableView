import UKTableViewCell from "../cell/UKTableViewCell";
import { EUKHorizontalDirection, EUKTableViewType, EUKVerticalDirection } from "../EUKTableViewType";
import { IVisiableRect, uk } from "../util/uk";
import { IUKLayout } from "./IUKLayout";

interface ILayoutCal {
    getPaddingCount(): number;
    getSpace(): number;
    getSide(node: cc.Node): number;
    setSide(node: cc.Node, side: number): void;

    getStartPos(content: cc.Node): number;
    getNextPos(curPos: number, side: number): number;
    setPos(node: cc.Node, pos: number, side: number): void;

    getStartOffset(): number;
    getNextOffset(curOffset: number, index: number, side: number): number;
    getOffset(content: cc.Node, curOffset: number): number;
    toOffset(scrollView: cc.ScrollView, eleOffset: number): cc.Vec2;

    /** 是否超出可视边界 */
    isOver(curPos: number, visiableRect: IVisiableRect): boolean;

    /**
     * 是否在显示区域外
     * @param curPos 
     * @param nextPos 
     * @param visiableRect 
     */
    isOut(curPos: number, nextPos: number, visiableRect: IVisiableRect): boolean;
}

export class UKLayout implements IUKLayout {
    private _type: EUKTableViewType;
    private _verDir: EUKVerticalDirection;
    private _horDir: EUKHorizontalDirection;

    protected _lastLayoutRect?: IVisiableRect;

    paddingTop: number = 0;
    paddingBottom: number = 0;
    paddingLeft: number = 0;
    paddingRight: number = 0;
    spaceY: number = 0;
    spaceX: number = 0;

    minSide?: number = 0;

    minDiff = 1;

    sizeAtIndex?: (index: number) => number;
    cellAtIndex?: (index: number) => UKTableViewCell;
    recyleCell?: (cell: UKTableViewCell) => void;

    constructor(type: EUKTableViewType, verDir: EUKVerticalDirection, horDir: EUKHorizontalDirection) {
        this._type = type;
        this._verDir = verDir;
        this._horDir = horDir
    }

    destory() {
        this.sizeAtIndex = undefined;
        this.cellAtIndex = undefined;
        this.recyleCell = undefined;
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset?: boolean): void {
        const side = this.calContentSize(count);
        this.setSide(scroll.content, side);
    }

    calContentSize(count: number): number {
        if (count <= 0) {
            return 0;
        }

        let size = this.getPaddingCount() + (count - 1) * this.getSpace();
        for (let index = 0; index < count; ++index) {
            size += this.sizeAtIndex(index);
        }

        return Math.max(size, this.minSide || 0);
    }

    getChildCells(content: cc.Node): UKTableViewCell[] {
        return content.children
            .map(node => node.getComponent(UKTableViewCell))
            .filter(c => c != null);
    }

    insertCellAtIndexs(content: cc.Node, indexs: number[]): void {
        const cells = this.getChildCells(content)
            .sort((c1, c2) => c1.index - c2.index);
        const targetIndexs = indexs.sort((i1, i2) => i1 - i2);
        const [minIndex, maxIndex] = [targetIndexs[0], targetIndexs[indexs.length - 1]];
        const [minCellIndex, maxCellIndex] = [cells[0].index, cells[cells.length - 1].index];

        if ((minIndex > maxCellIndex) || (maxIndex < minCellIndex)) {
            // no need insert real
            return;
        }

        indexs.forEach(index => {
            if (index >= minCellIndex) {
                this.insertOneCellAt(content, index);

                cells.forEach(cell => {
                    if (cell.index >= index) {
                        cell.__fixIndex(cell.index + 1);
                    }
                });
            }
        });
    }

    deleteCellAtIndexs(content: cc.Node, indexs: number[]): void {
        const cells = this.getChildCells(content)
            .sort((c1, c2) => c1.index - c2.index);

        let delCount = 0;

        cells.forEach(cell => {
            const cellIndex = cell.index;
            if (indexs.indexOf(cellIndex) >= 0) {
                delCount++;
                this.recyleCell(cell);
            } else if (delCount > 0) {
                cell.__fixIndex(cellIndex - delCount);
            }
        });
    }

    doLayout(scollView: cc.ScrollView, count: number): void {
        const visiableRect = uk.getVisiable(scollView);
        if (!IVisiableRect.isMoved(this._lastLayoutRect, visiableRect, Math.max(this.minDiff, 0.1))) {
            return;
        }

        this._lastLayoutRect = visiableRect;

        const content = scollView.content;
        const cells = this.getChildCells(content);
        this.doCycleCell(cells, visiableRect);
        this.doFillCell(scollView, cells, count);
    }

    fixPositions(scroll: cc.ScrollView, count: number): void {
        if (scroll.content.childrenCount <= 0) {
            return;
        }

        this._lastLayoutRect = undefined;

        const content = scroll.content;
        const cells = this.getChildCells(content);
        const cellCount = cells.length;
        const cal = this.cal;
        
        const mapNodes: {[index: number]: cc.Node} = {};
        cells.forEach(cell => mapNodes[cell.index] = cell.node);

        let layoutCount = 0;
        let nextPos = cal.getStartPos(content);

        for (let index = 0, times = 0; times < count; ++times, index++) {
            const curPos = nextPos;
            const side = this.sizeAtIndex(index);
            
            nextPos = cal.getNextPos(curPos, side);
            
            const node = mapNodes[index];
            if (!node) {
                continue;
            }

            cal.setPos(node, curPos, side);

            if ((++layoutCount) == cellCount) {
                break;
            }
        }
    }

    protected getPaddingCount(): number {
        return this.cal.getPaddingCount();
    }

    protected getSpace(): number {
        return this.cal.getSpace();
    }

    protected insertOneCellAt(content: cc.Node, index: number) {
        const cell = this.cellAtIndex(index);

        cell.__addWithParent(content);
        cell.__fixIndex(index);
        
        return cell;
    }

    setSide(node: cc.Node, side: number): void {
        this.cal.setSide(node, side);
    }

    getSide(node: cc.Node): number {
        return this.cal.getSide(node);
    }

    getOffsetOfIndex(scroll: cc.ScrollView, eleIndex: number, eleCount: number): cc.Vec2 {
        const cal = this.cal;

        let offset = cal.getStartOffset();
        for (let index = 0; index < eleCount; index++) {
            if (index == eleIndex) {
                break;
            }

            offset = cal.getNextOffset(offset, index, this.sizeAtIndex(index));
        }

        offset = cal.getOffset(scroll.content, offset);
        return cal.toOffset(scroll, offset);
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

        const cal = this.cal;

        let showedIndexs = showedCells.map(c => c.index);
        let nextPos = cal.getStartPos(content);
        for (let index = 0; index < eleCount; index++) {
            const curPos = nextPos;
            const side = this.sizeAtIndex(index);

            nextPos = cal.getNextPos(curPos, side);

            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const visiable = !cal.isOut(curPos, nextPos, visiableRect);
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

    private get cal() {
        if (this._type == EUKTableViewType.VERTICAL) {
            return this._verDir == EUKVerticalDirection.TOP_TO_BOTTOM ? this._vCalT2B : this._vCalB2T;
        }
        return this._horDir == EUKHorizontalDirection.LEFT_TO_RIGHT ? this._hCalL2R : this._hCalR2L;
    }

    private _vCalT2B: ILayoutCal = {
        getPaddingCount: () => this.paddingTop + this.paddingBottom,
        getSpace: () => this.spaceY,
        getSide: (node) => node.height,
        setSide: (node, side) => uk.setHight(node, side),

        getStartPos: (content) => uk.getContentTop(content) - this.paddingTop,
        getNextPos: (curPos, side) => curPos - side - this.spaceY,
        setPos: (node, pos, side) => uk.setYByTop(node, pos, side),
    
        getStartOffset: () => this.paddingTop,
        getNextOffset: (curOffset, index, side) => curOffset + side + this.spaceY,
        getOffset: (_, curOffset) => curOffset,
        toOffset: (scrollView, eleOffset) => cc.v2(scrollView.getScrollOffset().x, eleOffset),
    
        isOver: (curPos, visiableRect) => curPos < visiableRect.bottom,
        isOut: (curPos, nextPos, visiableRect) => {
            const top = Math.max(curPos, nextPos);
            const bottom = Math.min(curPos, nextPos);
            return (top < visiableRect.bottom) || (bottom > visiableRect.top);
        },
    };

    private _vCalB2T: ILayoutCal = {
        getPaddingCount: () => this.paddingTop + this.paddingBottom,
        getSpace: () => this.spaceY,
        getSide: (node) => node.height,
        setSide: (node, side) => uk.setHight(node, side),

        getStartPos: (content) => uk.getContentBottom(content) + this.paddingBottom,
        getNextPos: (curPos, side) => curPos + side + this.spaceY,
        setPos: (node, pos, side) => uk.setYByBottom(node, pos, side),

        getStartOffset: () => this.paddingBottom,
        getNextOffset: (curOffset, index, side) => curOffset + side + (index > 0 ? this.spaceY : 0),
        getOffset: (content, curOffset) => content.height - curOffset,
        toOffset: (scrollView, eleOffset) => cc.v2(scrollView.getScrollOffset().x, eleOffset),

        isOver: (curPos, visiableRect) => curPos > visiableRect.top,
        isOut: (curPos, nextPos, visiableRect) => {
            const top = Math.max(curPos, nextPos);
            const bottom = Math.min(curPos, nextPos);
            return (top < visiableRect.bottom) || (bottom > visiableRect.top);
        },
    };

    private _hCalL2R: ILayoutCal = {
        getPaddingCount: () => this.paddingRight + this.paddingLeft,
        getSpace: () => this.spaceX,
        getSide: (node) => node.width,
        setSide: (node, side) => uk.setWidth(node, side),

        getStartPos: (content) => uk.getContentLeft(content) + this.paddingLeft,
        getNextPos: (curPos, side) => curPos + side + this.spaceX,
        setPos: (node, pos, side) => uk.setXByLeft(node, pos, side),

        getStartOffset: () => this.paddingLeft,
        getNextOffset: (curOffset, index, side) => curOffset + side + this.spaceX,
        getOffset: (_, curOffset) => curOffset,
        toOffset: (scrollView, eleOffset) => cc.v2(eleOffset, scrollView.getScrollOffset().y),

        isOver: (curPos, visiableRect) => curPos > visiableRect.right,
        isOut: (curPos, nextPos, visiableRect) => {
            const left = Math.min(curPos, nextPos);
            const right = Math.max(curPos, nextPos);
            return (right < visiableRect.left) || (left > visiableRect.right);
        },
    };

    private _hCalR2L: ILayoutCal = {
        getPaddingCount: () => this.paddingRight + this.paddingLeft,
        getSpace: () => this.spaceX,
        getSide: (node) => node.width,
        setSide: (node, side) => uk.setWidth(node, side),

        getStartPos: (content) => uk.getContentRight(content) - this.paddingRight,
        getNextPos: (curPos, side) => curPos - side - this.spaceX,
        setPos: (node, pos, side) => uk.setXByRight(node, pos, side),

        getStartOffset: () => this.paddingRight,
        getNextOffset: (curOffset, index, side) => curOffset + side + (index > 0 ? this.spaceX : 0),
        getOffset: (content, curOffset) => content.width - curOffset,
        toOffset: (scrollView, eleOffset) => cc.v2(eleOffset, scrollView.getScrollOffset().y),

        

        isOver: (curPos, visiableRect) => curPos < visiableRect.left,
        isOut: (curPos, nextPos, visiableRect) => {
            const left = Math.min(curPos, nextPos);
            const right = Math.max(curPos, nextPos);
            return (right < visiableRect.left) || (left > visiableRect.right);
        },
    };

}