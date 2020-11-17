import UKTableViewCell from "../cell/UKTableViewCell";
import { IUKLayout } from "./IUKLayout";

export class UKLayout implements IUKLayout {
    protected doLayoutOffset: number = -1;

    head: number = 0;
    tail: number = 0;
    space: number = 0;

    minDiff = 1;

    sizeAtIndex?: (index: number) => number;
    cellAtIndex?: (index: number) => UKTableViewCell;
    recyleCell?: (cell: UKTableViewCell) => void;

    destory() {
        this.sizeAtIndex = undefined;
        this.cellAtIndex = undefined;
        this.recyleCell = undefined;
    }

    initLayout(layout: cc.Layout) {
        throw '应该由子类实现';
    }

    calContentSize(count: number): number {
        throw '应该由子类实现';
    }

    doLayout(scollView: cc.ScrollView, count: number): void {
        throw '应该由子类实现';
    }
}