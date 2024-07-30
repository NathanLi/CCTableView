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

export class UIGridLayout {
    options: ILayoutArgs;
    delegate: ILayoutDelegate;

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

    private _calContentSize(count: number): cc.Size {
        const paddingWidth = this.options.paddingLeft + this.options.paddingRight;
        const paddingHeight = this.options.paddingTop + this.options.paddingBottom;
        const content = this.options.scrollView.content;
        
        let ret = cc.size(0, 0);

        let width = 0;
        let height = 0;

        let curWidth = paddingWidth;
        let maxWidth = content.width;

        for (let i = 0; i < count; ++i) {
            const cellSize = this.delegate.sizeAtIndex(i);

        }




        return ret;
    }
}