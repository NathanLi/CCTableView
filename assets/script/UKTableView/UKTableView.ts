import UKTableViewCell, { ICellSizeChangedInfo } from "./cell/UKTableViewCell";
import { EUKTableViewType, EUKVerticalDirection, EUKHorizontalDirection } from "./EUKTableViewType";
import { IUKLayout } from "./layout/IUKLayout";
import { UKLayoutHorizontal } from "./layout/UKLayoutHorizontal";
import { UKLayoutVertical } from "./layout/UKLayoutVertical";
import { UKTableViewDataSrouce } from "./UKTableViewDataSource";
import { UKTableViewDelegate } from "./UKTableViewDelegate";

const DEFAULT_KEY = 'default';

class UKDelegateCacheSize implements UKTableViewDelegate {
    private _cache: {[index: number]: number} = {};

    sizeAtIndex(index: number) {
        return this._cache[index] || 0;
    }

    onSizeChanged(index: number, size: number) {
        this._cache[index] = size;
    }
}

/**
 * cell 重用 option
 */
export interface IDequeueReusableOption {
    /**
     * 如果有，则先重用同 `index` 的 cell
     */
    index?: number;

    /**
     * 与 delegate.sizeAtIndex(`index`) 的边长大小相同优先(默认为 true)；
     * 注意：优先级高于 `index`；
     * 
     * 前置条件：`index` >= 0。
     */
    sameSizeFirst?: boolean;

    /**
     * 可以任意重用(默认为 true)  
     * 
     * 注意：如果你打算设置为 false，那么很可能会导致无法重用 cell，进而造成内存浪费
     */
    any?: boolean;
}


const {ccclass, property, executionOrder, menu} = cc._decorator;

@ccclass
@menu('UIKit/UKTableView/UKTableView')
@executionOrder(-1)
export default class UKTableView extends cc.Component {
    @property(cc.ScrollView)
    scrollView: cc.ScrollView = null;

    @property({type: cc.Enum(EUKTableViewType), tooltip: CC_DEV && 'VERTICAL: 垂直自动排列\n HORIZONTAL: 水平自动排列'})
    type: EUKTableViewType = EUKTableViewType.VERTICAL;

    @property({
        tooltip: CC_DEV && '容器内上边距，只会在一个布局方向上生效',
        visible:function() {return this.type == EUKTableViewType.VERTICAL},
    })
    paddingTop: number = 0;

    @property({
        tooltip: CC_DEV && '容器内下边距，只会在一个布局方向上生效',
        visible:function() {return this.type == EUKTableViewType.VERTICAL}, 
    })
    paddingBottom: number = 0;

    @property({
        tooltip: CC_DEV && '容器内左边距，只会在一个布局方向上生效',
        visible:function() {return this.type == EUKTableViewType.HORIZONTAL}, 
    })
    paddingLeft: number = 0;

    @property({
        tooltip: CC_DEV && '容器内右边距，只会在一个布局方向上生效',
        visible:function() {return this.type == EUKTableViewType.HORIZONTAL}, 
    })
    paddingRight: number = 0;

    @property({
        visible:function() {return this.type == EUKTableViewType.VERTICAL}, 
        tooltip: CC_DEV && '相邻子节点间的垂直距离',
    })
    spaceY: number = 0;

    @property({
        visible:function() {return this.type == EUKTableViewType.HORIZONTAL}, 
        tooltip: CC_DEV && '相邻子节点间的水平距离',
    })
    spaceX: number = 0;

    @property({
        visible:function() {return this.type == EUKTableViewType.VERTICAL}, 
        tooltip: CC_DEV && '垂直排列子节点的方向，包括：\nTOP_TO_BOTTOM: 从上往下排\nBOTTOM_TO_TOP: 从下往上排',
        type: cc.Enum(EUKVerticalDirection)
    })
    verticalDirection: EUKVerticalDirection = EUKVerticalDirection.TOP_TO_BOTTOM;

    @property({
        visible:function() {return this.type == EUKTableViewType.HORIZONTAL}, 
        tooltip: CC_DEV && '水平排列子节点的方向，包括：\nLEFT_TO_RIGHT: 从上往下排\nRIGHT_TO_LEFT: 从下往上排',
        type: cc.Enum(EUKHorizontalDirection)
    })
    horizontalDirection: EUKHorizontalDirection = EUKHorizontalDirection.LEFT_TO_RIGHT;

    @property({
        tooltip: CC_DEV && '内容不足时，是否可滑动'
    })
    enableScrollAlways: boolean = false;

    private _isOffsetInited: boolean = false;
    private _count: number = 0;
    private _layout: IUKLayout;

    /** 注册的 cell 的默认边长 */
    private _defaultCellSide: number = 0;

    /** 用于重新布局的 timer */
    private _timerLayout?: any;
    private _timerInitOffset?: any;

    /** 滚动时的目标 target */
    private _scrollTarget: UKScrollInfo = null;

    private _cacheCell: {[identifier: string]: [UKTableViewCell]} = {};
    private _registedCell: {[identifier: string]: cc.Node | cc.Prefab} = {};

    dataSource: UKTableViewDataSrouce;
    delegate: UKTableViewDelegate = new UKDelegateCacheSize();

    private _content: cc.Node = null;
    private get content() {
        if (!cc.isValid(this._content)) {
            this._content = this.scrollView.content;
        }
        return this._content;
    }

    onLoad() {
        this.regsiteFromContent();
        // this.scrollView.content.on(cc.Node.EventType.POSITION_CHANGED, () => {
        //     const y = this.scrollView.content.y;
        //     cc.log('y: ', y);
        // });
    }

    onDestroy() {
        for (let key in this._cacheCell) {
            this._cacheCell[key].forEach(v => v.destroy());
        }

        for (let key in this._registedCell) {
            const value = this._registedCell[key];
            if (isNode(value) && cc.isValid(value)) {
                // Prefab 不能释放是因为其应该由外部自己释放
                value.destroy();
            }
        }

        if (this._layout) {
            this._layout.destory();
        }

        this.dataSource = null;
        this.delegate = null;
    }

    private regsiteFromContent() {
        this.content.children.slice().forEach(node => {
            const comp = node.getComponent(UKTableViewCell);
            if (comp && comp.identifier) {
                this.registe(node, comp.identifier);
            }
        });

        this.content.removeAllChildren();
    }

    registe(source: cc.Node | cc.Prefab, identifier?: string): void {
        if (!identifier) {
            identifier = DEFAULT_KEY;
        }
        this._registedCell[identifier] = source;
    }

    dequeueReusableCell(identifier?: string, option?: IDequeueReusableOption): UKTableViewCell {
        if (!identifier) {
            identifier = DEFAULT_KEY;
        }

        let cell = this._loadFromCache(identifier, option);
        if (!cell) {
            let source = this._registedCell[identifier];
            let node: cc.Node;
            if (isNode(source) && !source.parent) {
                // 如果来源未被使用，则直接使用它
                node = source as cc.Node;
            } else {
                node = cc.instantiate(source) as cc.Node;
            }

            cell = node.getComponent(UKTableViewCell);
            if (!cell) {
                cell = node.addComponent(UKTableViewCell);
                cell.identifier = identifier;
            }
        }

        if (option?.index >= 0) {
            const size = this.delegate.sizeAtIndex(option.index);
            if (size > 0 && (this._layout.getSide(cell.node) != size)) {
                this._layout.setSide(cell.node, size);
            }
        }

        cell.__toUse();
        cell.node.on(UKTableViewCell.EventSizeChanged, this.onCellSizeChanged, this);

        return cell;
    }

    private _loadFromCache(identifier: string, option?: IDequeueReusableOption) {
        const cacheCells = this._cacheCell[identifier];

        if (!cacheCells?.length) {
            return null;
        }

        const index = isNil(option?.index) ? -1 : option.index;
        const sameSizeFirst = ((index >= 0) && !isNil(option?.sameSizeFirst)) ? option.sameSizeFirst : true;
        const any = isNil(option?.any) ? true : option.any;

        if (index >= 0) {
            let cellIndex = -1;

            if ((cellIndex < 0) && sameSizeFirst) {
                cellIndex = cacheCells.findIndex(c => this._layout.getSide(c.node) == this.delegate.sizeAtIndex(index));
            }

            if (cellIndex < 0) {
                cellIndex = cacheCells.findIndex(c => c.index == index);
            }

            if (cellIndex >= 0) {
                const cell = cacheCells[cellIndex];
                cacheCells.splice(cellIndex, 1);
                return cell;
            }
        }

        if (any) {
            return cacheCells.pop();
        }

        return null;
    }

    reloadData(count: number): void {
        if (!this.dataSource) {
            throw 'you should set dataSource!';
        }

        this._count = count;

        this.recycleAllCells();
        this.setupLayoutArgs();
        this._setupContentSize();

        this.doLayout();
        this._initOffsetNextTime();
    }
    
    insert(indexs: number[]): void {
        if (!indexs || !indexs.length) {
            return;
        }

        // indexs 的合法性校验
        const maxCount = this._count + indexs.length;
        for (let i = 0; i < indexs.length; ++i) {
            const index = indexs[i];
            if (index < 0 || index >= maxCount) {
                throw new Error(`${index} not exist!`);
            }
        }

        this._count += indexs.length;
        this._layout.insertCellAtIndexs(this.content, indexs);
        this._relayoutNextTime();
    }

    delete(indexs: number[]): void {
        if (!indexs || !indexs.length) {
            return;
        }

        for (let i = 0; i < indexs.length; ++i) {
            const index = indexs[i];
            if (index < 0 || index >= this._count) {
                throw new Error(`${index} not exist!`);
            }
        }

        this._count -= indexs.length;
        this._layout.deleteCellAtIndexs(this.content, indexs);
        this._relayoutNextTime();
    }

    /**
     * 
     * @param index 滚动到的目标
     * @param timeInSecond 动画时长
     * @param attenuated 滚动加速度是否衰减
     */
    scrollToIndex(index: number, timeInSecond: number = 0, attenuated = true): void {
        const toIndex = Math.min(Math.max(index, 0), this._count - 1);
        const pos = this._layout.getOffsetOfIndex(this.scrollView, toIndex, this._count);
        
        this._scrollTarget = new UKScrollInfo(toIndex, timeInSecond, attenuated);
        this.scrollView.scrollToOffset(pos, timeInSecond, attenuated);
    }

    visiableCells(): UKTableViewCell[] {
        return this._layout.getChildCells(this.content);
    }

    visiableCell(index: number): UKTableViewCell {
        const cells = this.visiableCells();
        return cells.find(c => c.index == index);
    }

    visiableIndexs() {
        return this.visiableCells().map(c => c.index);
    }

    /**
     * 设置默认的边长
     * @param size 
     */
    setDefaultSize(size: number) {
        this._defaultCellSide = size;
    }

    private setupLayoutArgs() {
        const ndContent = this.content;
        const cclayout = ndContent.getComponent(cc.Layout);

        cclayout && (cclayout.enabled = false); 

        this._layout && (this._layout.destory());
        this._layout = this.createLayout();       
        
        this.calAveSide();
    }

    private calAveSide() {
        if (this._defaultCellSide > 0) {
            return;
        }

        for (let key of Object.keys(this._registedCell)) {
            let value = this._registedCell[key];
            let side = 0;
            if (isNode(value)) {
                side = this._layout.getSide(value);
            } else {
                side = this._layout.getSide((value as cc.Prefab).data);
            }

            this._defaultCellSide = side;
        }
    }

    private recycleAllCells() {
        if (this._layout) {
            this._layout.getChildCells(this.content).forEach(cell => {
                this.doRecycleCell(cell);
            });
        }
    }

    private createLayout() {

        let layout: IUKLayout;
        if (this.type == EUKTableViewType.VERTICAL) {
            layout = new UKLayoutVertical(this.verticalDirection);
        } else {
            layout = new UKLayoutHorizontal(this.horizontalDirection == EUKHorizontalDirection.LEFT_TO_RIGHT);
        }

        layout.paddingTop = this.paddingTop;
        layout.paddingBottom = this.paddingBottom;
        layout.paddingLeft = this.paddingLeft;
        layout.paddingRight = this.paddingRight;
        layout.spaceX = this.spaceX;
        layout.spaceY = this.spaceY;
        layout.recyleCell = cell => this.doRecycleCell(cell);
        layout.sizeAtIndex = index => this.sizeAtIndex(index);
        layout.cellAtIndex = index => this.cellAtIndex(index);
        return layout;
    }

    private _setupContentSize() {
        this._layout.minSide = this.enableScrollAlways ? ((this.type == EUKTableViewType.VERTICAL ? this.node.height : this.node.width) + 1.0) : 0;
        this._layout.setupContentSize(this.scrollView, this._count);
    }

    private doLayout() {
        this._layout && this._layout.doLayout(this.scrollView, this._count);
    }

    private sizeAtIndex(index: number): number {
        let size = this.delegate.sizeAtIndex(index);
        if (!size) {
            size = this._defaultCellSide;
            this.delegate.onSizeChanged(index, size);
        }

        return size;
    }

    private doRecycleCell(cell: UKTableViewCell): void {
        cell.__prepareForReuse();
        cell.node.removeFromParent(false);

        const identifier = cell.identifier;
        if (this._cacheCell[identifier]) {
            this._cacheCell[identifier].push(cell);
        } else {
            this._cacheCell[identifier] = [cell];
        }
    }

    private cellAtIndex(index: number): UKTableViewCell {
        const cell = this.dataSource.cellAtIndex(index);
        cell.__fixIndex(index);

        const side = this._layout.getSide(cell.node);
        const cache = this.delegate.sizeAtIndex(index);
        if (cache && (side != cache)) {
            this.delegate.onSizeChanged(index, side);
            this._relayoutNextTime();
        }

        return cell;
    }

    private onCellSizeChanged(info: ICellSizeChangedInfo) {
        const cell = info.cell;
        if (!cell.node.parent) {
            return;
        }

        const side = this._layout.getSide(cell.node);
        const index = cell.index;

        this.delegate.onSizeChanged(index, side);

        this._relayoutNextTime();
    }

    /**
     * 下一个时间片进行重新布局
     * 
     * 不实时布局的的原因在于：
     * 多个 cell 的 side 可能同时在更改，在布局的过程中，有 cell 的 side 也可能会改。如果实时布局，那么可能会导致布局不正确。
     */
    private _relayoutNextTime() {
        if (this._timerLayout) {
            return;
        }

        this._timerLayout = setTimeout(() => {
            if (cc.isValid(this, true)) {
                this._relayout();
            }
        });
    }

    private _relayout() {
        this._timerLayout = 0;
        this._setupContentSize();
        this._fixCellPositions();
        this._fixScrollPos();

        this._initOffsetNextTime();
    }

    private _initOffsetNextTime() {
        if (this._isOffsetInited || this._timerInitOffset) {
            return;
        }

        this._timerInitOffset = setTimeout(() => {
            if (cc.isValid(this, true)) {
                this._initOffset();
            }
        });
    }

    private _initOffset() {
        this._timerInitOffset = 0;

        if (!this._isOffsetInited) {
            this._isOffsetInited = true;
            // init the offset
            if (this.type == EUKTableViewType.VERTICAL) {
                if (this.verticalDirection == EUKVerticalDirection.BOTTOM_TO_TOP) {
                    this.scrollView.scrollToBottom();
                } else {
                    this.scrollView.scrollToTop();
                }
            } else {
                if (this.horizontalDirection == EUKHorizontalDirection.RIGHT_TO_LEFT) {
                    this.scrollView.scrollToRight();
                } else {
                    this.scrollView.scrollToLeft();
                }
            }
        }
    }

    private _fixCellPositions() {
        this._layout.fixPositions(this.scrollView, this._count);
    }

    private _fixScrollPos() {
        if (this.scrollView.isAutoScrolling() && this._scrollTarget) {
            const pos = this._layout.getOffsetOfIndex(this.scrollView, this._scrollTarget.targetIndex, this._count);
            const duration = Math.max(this._scrollTarget.remainDuration(), 0.1);
            this.scrollView.scrollToOffset(pos, duration, this._scrollTarget.attenuated);
        }
    }

    lateUpdate() {
        this.doLayout();

        if ((!this.scrollView || !this.scrollView.isAutoScrolling()) && this._scrollTarget) {
            this._scrollTarget = null;
        }
    }
}

function isNode(v: cc.Node | cc.Prefab): v is cc.Node {
    return (v as cc.Node).getComponent != undefined;
}

function isNil(v: any): v is undefined | null {
    return v === undefined || v === null;
}

class UKScrollInfo {
    targetIndex: number;
    timeInSecond: number;
    attenuated: boolean;

    /** 开始时间(毫秒) */
    startTime: number;

    constructor(index: number, timeInSecond?: number, attenuated?: boolean) {
        this.targetIndex = index;
        this.timeInSecond = timeInSecond || 0;
        this.attenuated = attenuated || false;
        this.startTime = getTimeInMilliseconds();
    }

    remainDuration(): number {
        const duration = getTimeInMilliseconds() - this.startTime;
        const remain = Math.max(0, (this.timeInSecond * 1000 - duration) / 1000.0);
        return remain;
    }
}

let getTimeInMilliseconds = function() {
    let currentTime = new Date();
    return currentTime.getMilliseconds();
};