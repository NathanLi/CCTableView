import UKTableViewCell from "../cell/UKTableViewCell";
import { IVisiableRect } from "../util/uk";
import { IUKLayout } from "./IUKLayout";

export class UKLayout implements IUKLayout {
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

    destory() {
        this.sizeAtIndex = undefined;
        this.cellAtIndex = undefined;
        this.recyleCell = undefined;
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset?: boolean): void {
        throw '应该由子类实现';
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
        throw '应该由子类实现';
    }

    fixPositions(scollView: cc.ScrollView, count: number): void {
        throw '应该由子类实现';
    }

    protected getPaddingCount(): number {
        throw '应该由子类实现';
    }

    protected getSpace(): number {
        throw '应该由子类实现';
    }

    protected insertOneCellAt(content: cc.Node, index: number) {
        const cell = this.cellAtIndex(index);

        cell.__addWithParent(content);
        cell.__fixIndex(index);
        
        return cell;
    }

    setSide(node: cc.Node, side: number): void {
        throw '应该由子类实现';
    }

    getSide(node: cc.Node): number {
        throw '应该由子类实现';
    }

    getOffsetOfIndex(scroll: cc.ScrollView, eleIndex: number, eleCount: number): cc.Vec2 {
        throw '应该由子类实现';
    }
}