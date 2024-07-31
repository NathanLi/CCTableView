import { IVisiableRect, uk } from "../../UKTableView/util/uk";
import UIGridCell from "../cell/UIGridCell";

interface ILayoutArgs {
    /**
     * 滑动类型：0：垂直滑动，1：水平滑动
     */
    type: 0 | 1;

    /**
     * 水平布局方向：0：左到右，1：右到左
     */
    horizontalLayoutDir: 0 | 1;

    /**
     * 垂直布局方向：0：上到下，1：下到上
     */
    verticalLayoutDir: 0 | 1;

    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    spaceX: number;
    spaceY: number;
    enableScrollAlways: boolean;

    scrollView: cc.ScrollView;
}

interface ILayoutDelegate {
    sizeAtIndex?: (index: number) => cc.Size;
    cellAtIndex: (index: number) => UIGridCell;
    recyleCell: (cell: UIGridCell) => void;
}

interface IGridLayoutCal {
    getStartPos(content: cc.Node): cc.Vec2;
}

export class UIGridLayout {
    options: ILayoutArgs;
    delegate: ILayoutDelegate;

    private _lastLayoutRect?: IVisiableRect;
    private cal: IGridLayoutCal;

    recycleAllCells() {
        this.getCells().forEach(cell => {
            this.delegate.recyleCell(cell);
        });
    }

    getCells(): UIGridCell[] {
        return this.options.scrollView.content.children
            .map(node => node.getComponent(UIGridCell))
            .filter(cell => cell != null);
    }

    setupContentSize(count: number): void {
        const size = this._calContentSize(count);
        const content = this.options.scrollView.content;
        content.setContentSize(size);
    }

    doLayout(count: number): void {
        const scrollView = this.options.scrollView;
        const visiableRect = uk.getVisiable(scrollView);
        if (!IVisiableRect.isMoved(this._lastLayoutRect, visiableRect)) {
            return;
        }

        this._lastLayoutRect = visiableRect;

        const cells = this.getCells();
        this.doCycleCell(visiableRect, cells);
        this.doFillCell(visiableRect, cells, count);
    }

    private _calContentSize(count: number): cc.Size {
        const options = this.options;
        const paddingWidth = options.paddingLeft + options.paddingRight;
        const paddingHeight = options.paddingTop + options.paddingBottom;

        const scrollView = options.scrollView;
        
        /** 固定边(行或列)。如：垂直滑动，则 宽度 是不可变的固定边 */
        let fixedEdge = scrollView.node.width;
        /** 需要计算的滑动方向的 边 */
        let edge = 0;

        /** 固定边的最大长度 */
        const maxFixed = fixedEdge - paddingWidth;
        /** 当前 本行/列  所有元素加起来的总固定向边长 */
        let curFixed = 0;
        
        /** 当前 本行/列 滑动向 最大的边长 */
        let curMaxELeEdge = 0;
        let fixedSpace = 0;
        let curSpace = 0;

        for (let i = 0; i < count; ++i) {
            const cellSize = this.delegate.sizeAtIndex(i);

            curFixed = curFixed + cellSize.width + fixedSpace;
            curMaxELeEdge = Math.max(curMaxELeEdge, cellSize.height);

            fixedSpace = options.spaceX;

            if (curFixed > maxFixed) {
                // 换行/换列
                fixedSpace = 0;
                curFixed = 0;
                curMaxELeEdge = 0;

                // 滑动方向长度增加
                edge += (curSpace + curMaxELeEdge);
                // 滑动方向的 space 更新
                curSpace = options.spaceY;
            }

        }

        return cc.size(fixedEdge, edge + paddingHeight);
    }

    private doCycleCell(visiableRect: IVisiableRect, cells: UIGridCell[]): void {
        cells.forEach(cell => {
            if (uk.isOut(cell.node, visiableRect)) {
                this.delegate.recyleCell(cell);
            }
        });
    }

    private doFillCell(visiableRect: IVisiableRect, showedCells: UIGridCell[], eleCount: number) {
        showedCells = showedCells.filter(c => !!c.node.parent);

        const cal = this.cal;
        const content = this.options.scrollView.content;
        const showedIndexs = showedCells.map(c => c.index);

        let nextPos = cal.getStartPos(content);
        for (let index = 0; index < eleCount; ++index) {
            
        }
    }
}