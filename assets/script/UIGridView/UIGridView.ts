import UIGridCell, { ICellSizeChangedInfo } from "./cell/UIGridCell";
import { UIGridLayout } from "./layout/UIGridLayout";
import { UIGridViewDataSource } from "./UIGridViewDataSource";
import { UIGridViewDelegate } from "./UIGridViewDelegate";

const {ccclass, property, menu} = cc._decorator;

/**
 * 滑动方向
 */
export enum EUIGridViewType {
    /** 垂直方向滑动 */
    VERTICAL = 0,
    /** 水平方向滑动 */
    HORIZONTAL = 1
}

/** 垂直布局方向 */
export enum EUIVerticalLayout {
    /** 上 到 下 布局 */
    TOP_TO_BOTTOM = 0,
    /** 下 到 上 布局 */
    BOTTOM_TO_TOP = 1,
}

/** 水平布局方向 */
export enum EUIHorizontalLayout {
    /** 左 到 右 布局 */
    LEFT_TO_RIGHT = 0,
    /** 右 到 左 布局 */
    RIGHT_TO_LEFT = 1,
}

const DEFAULT_KEY = 'default';





@ccclass
@menu('UIKit/UIGridView/UIGridView')
export default class UIGridView extends cc.Component {
    @property(cc.ScrollView)
    scrollView: cc.ScrollView = null;

    @property({type: cc.Enum(EUIGridViewType), tooltip: CC_DEV && 'VERTICAL: 垂直滑动\n HORIZONTAL: 水平滑动'})
    type: EUIGridViewType = EUIGridViewType.VERTICAL;

    @property({
        tooltip: CC_DEV && '容器内上边距',
    })
    paddingTop: number = 0;

    @property({
        tooltip: CC_DEV && '容器内下边距',
    })
    paddingBottom: number = 0;

    @property({
        tooltip: CC_DEV && '容器内左边距',
    })
    paddingLeft: number = 0;

    @property({
        tooltip: CC_DEV && '容器内右边距',
    })
    paddingRight: number = 0;

    @property({
        tooltip: CC_DEV && '相邻子节点间的垂直距离',
    })
    spaceY: number = 0;

    @property({
        tooltip: CC_DEV && '相邻子节点间的水平距离',
    })
    spaceX: number = 0;

    @property({
        tooltip: CC_DEV && '垂直排列子节点的方向，包括：\nTOP_TO_BOTTOM: 从上往下排\nBOTTOM_TO_TOP: 从下往上排',
        type: cc.Enum(EUIVerticalLayout)
    })
    verticalDirection: EUIVerticalLayout = EUIVerticalLayout.TOP_TO_BOTTOM;

    @property({
        tooltip: CC_DEV && '水平排列子节点的方向，包括：\nLEFT_TO_RIGHT: 从上往下排\nRIGHT_TO_LEFT: 从下往上排',
        type: cc.Enum(EUIHorizontalLayout)
    })
    horizontalDirection: EUIHorizontalLayout = EUIHorizontalLayout.LEFT_TO_RIGHT;

    @property({
        tooltip: CC_DEV && '内容不足时，是否可滑动'
    })
    enableScrollAlways: boolean = false;

    private _layout: UIGridLayout = new UIGridLayout();
    private _count = 0;

    private _cacheCell: {[identifier: string]: [UIGridCell]} = {};
    private _registedCell: {[identifier: string]: cc.Node | cc.Prefab} = {};

    get content() {
        return this.scrollView.content;
    }

    dataSource: UIGridViewDataSource;
    delegate: UIGridViewDelegate;

    protected onLoad(): void {
        this.regsiteFromContent();
    }

    protected onDestroy(): void {
        
    }

    private regsiteFromContent() {
        const content = this.content;
        content.children.slice().forEach(node => {
            const cell = node.getComponent(UIGridCell);
            if (cell?.identifier) {
                this.registe(node, cell.identifier);
                node.removeFromParent();
            }
        });

    }

    reloadData(count: number): void {
        if (!this.scrollView) {
            throw 'you should set scrollView!';
        }

        if (!this.dataSource) {
            throw 'you should set dataSource!';
        }

        this._count = count;

        this._setupLayoutArgs();

        this._layout.recycleAllCells();
        this._layout.setupContentSize(count);

    }

    registe(source: cc.Node | cc.Prefab, identifier?: string): void {
        identifier = identifier || DEFAULT_KEY;
        this._registedCell[identifier] = source;
    }

    dequeueReusableCell(identifier?: string): UIGridCell {
        identifier = identifier || DEFAULT_KEY;
        let cell = this._loadFromCache(identifier);
        if (!cell) {
            let source = this._registedCell[identifier];
            let node: cc.Node;
            if (isNode(source) && !source.parent) {
                // 如果来源未被使用，则直接使用它
                node = source as cc.Node;
            } else {
                node = cc.instantiate(source) as cc.Node;
            }

            cell = node.getComponent(UIGridCell);
            if (!cell) {
                cell = node.addComponent(UIGridCell);
                cell.identifier = identifier;
            }
        }

        cell.__toUse();
        cell.node.on(UIGridCell.EventSizeChanged, this.onCellSizeChanged, this);
        return cell;
    }

    private _loadFromCache(identifier: string) {
        const cache = this._cacheCell[identifier];
        return cache?.pop();
    }

    private onCellSizeChanged(info: ICellSizeChangedInfo) {
        const cell = info.cell;
        const size = info.size;

        // TODO:
    }



    private _setupLayoutArgs() {
        const cclayout = this.content.getComponent(cc.Layout);
        if (cclayout) {
            cclayout.enabled = false;
        }

        this._layout.options = {
            type: (this.type == EUIGridViewType.VERTICAL) ? 0 : 1,
            horizontalLayoutDir: this.horizontalDirection == EUIHorizontalLayout.LEFT_TO_RIGHT ? 0 : 1,
            verticalLayoutDir: this.verticalDirection == EUIVerticalLayout.TOP_TO_BOTTOM ? 0 : 1,
            paddingTop: this.paddingTop,
            paddingBottom: this.paddingBottom,
            paddingLeft: this.paddingLeft,
            paddingRight: this.paddingRight,
            spaceX: this.spaceX,
            spaceY: this.spaceY,
            enableScrollAlways: this.enableScrollAlways,

            scrollView: this.scrollView,
        };
    }

}


function isNode(v: cc.Node | cc.Prefab): v is cc.Node {
    return (v as cc.Node).getComponent != undefined;
}

function isNil(v: any): v is undefined | null {
    return v === undefined || v === null;
}
