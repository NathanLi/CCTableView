const {ccclass, property, menu} = cc._decorator;

export interface ICellSizeChangedInfo {
    cell: UIGridCell,
    size: cc.Size,
}

@ccclass
@menu('UIKit/UIGridView/UIGridCell')
export default class UIGridCell extends cc.Component {
    @property
    identifier: string = 'default';

    private __index: number = 0;

    __isUsing: boolean = false;

    get index() {
        return this.__index;
    }

    set index(index: number) {
        this.__index = index;
    }

    onPrepareForReuse?: () => void;
    onToUse?: () => void;

    static EventSizeChanged = 'UKTableViewCell-SizeChanged';
    static EventDidAddToParent = 'UKTableViewCell-EventDidAddToParent';

    onLoad() {
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.onSizeChanged, this);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.SIZE_CHANGED, this.onSizeChanged, this);
    }

    __fixIndex(index: number) {
        this.index = index;
    }

    /**
     * 将被使用
     */
    __toUse(): void {
        this.__isUsing = true;
        this.onToUse?.();
    }

    /**
     * 回收后准备重用
     */
    __prepareForReuse(): void {
        this.__isUsing = false;
        this.onPrepareForReuse?.();
    }

    __addWithParent(parent: cc.Node): void {
        this.node.parent = parent;
        
        this.node.emit(UIGridCell.EventDidAddToParent, {
            cell: this
        });
    }

    private onSizeChanged() {
        if (!this.__isUsing) {
            return;
        }

        if (!this.node.parent) {
            return;
        }

        const size = this.node.getContentSize();
        this.node.emit(UIGridCell.EventSizeChanged, {
            cell: this,
            size: size,
        });
    }
}
