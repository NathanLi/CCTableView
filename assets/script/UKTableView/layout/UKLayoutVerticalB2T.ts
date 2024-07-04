import UKTableViewCell from "../cell/UKTableViewCell";
import { IVisiableRect, uk } from "../util/uk";
import { UKLayout } from "./UKLayout";

export class UKLayoutVerticalB2T extends UKLayout {
    
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
        
        let layoutCount = 0;
        let nextBottom = this.paddingBottom + uk.getContentBottom(content);

        for (let index = 0; index < count; index++) {
            const curBottom = nextBottom;
            const side = this.sizeAtIndex(index);
            const curTop = curBottom + side;
            const node = mapNodes[index];

            nextBottom = curTop + this.spaceY;

            if (!node) {
                continue;
            }

            uk.setYByBottom(node, curBottom, side);

            if ((++layoutCount) == cellCount) {
                break;
            }
        }
    }

    setupContentSize(scroll: cc.ScrollView, count: number, fixOffset: boolean = false): void {
        const side = this.calContentSize(count);
        this.setSide(scroll.content, side);

        if (!fixOffset) {
            return;
        }

        const originOffset = scroll.getScrollOffset();
        const originSide = scroll.content.height;
        
        if (originOffset.y < 0) {
            // 原来只显示了最底部的几个
            scroll.scrollToPercentVertical(0);
            return;
        }

        const scrollHeight = scroll.node.height;
        if (side < scrollHeight) {
            // 现在只需要显示最底部
            scroll.scrollToPercentVertical(0);
            return;
        }

        // 尝试显示原来的 offset
        const diff = side - Math.max(scrollHeight, originSide);
        const offset = cc.v2(originOffset.x, originOffset.y + diff);
        scroll.scrollToOffset(offset);
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
        let bottom = 0 + this.paddingBottom;
        let toIndex = eleIndex;

        for (let index = 0; index < eleCount; index ++) {
            if (index == toIndex) {
                break;
            }

            if (index > 0) {
                bottom += this.spaceY;
            }
            
            bottom += this.sizeAtIndex(index);
        }

        const x = scroll.getScrollOffset().x;
        const y = scroll.content.height - bottom;
        return cc.v2(x, y);
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

        let showedIndexs = showedCells.map(c => c.index);
        let nextBottom = this.paddingBottom + uk.getContentBottom(content);

        for (let index = 0; index < eleCount; index++) {
            const curBottom = nextBottom;
            const side = this.sizeAtIndex(index);
            const curTop = curBottom + side;

            nextBottom = curTop + this.spaceY;
            if (showedIndexs.indexOf(index) >= 0) {
                continue;
            }

            const isOut = (curBottom >= visiableRect.top) || (curTop <= visiableRect.bottom);
            const visiable = !isOut;
            if (visiable) {
                const cell = this.insertOneCellAt(content, index);
                const node = cell.node;

                uk.setYByBottom(node, curBottom, side);
            }

            if (nextBottom > visiableRect.top) {
                break; 
            }
        }
    }
}