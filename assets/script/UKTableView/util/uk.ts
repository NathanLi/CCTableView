export interface IVisiableRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export class uk {
    static setYByBottom(node: cc.Node, bottom: number, height?: number): void {
        if (height === undefined) {
            height = node.height;
        }

        node.y = bottom + node.anchorY * height;
    }

    static setYByTop(node: cc.Node, top: number, height?: number): void {
        if (height === undefined) {
            height = node.height;
        }

        node.y = top - (1 - node.anchorY) * height;
    }

    static setHight(node: cc.Node, height: number): void {
        node.height = height;
    }

    static setWidth(node: cc.Node, width: number): void {
        node.width = width;
    }

    static setXByLeft(node: cc.Node, left: number, width?: number): void {
        if (width === undefined) {
            width = node.width;
        }

        node.x = left + node.anchorX * width;
    }

    static setXByRight(node: cc.Node, right: number, width?: number) {
        if (width === undefined) {
            width = node.width;
        }

        node.x = right - (1 - node.anchorX) * width;
    }

    static getTop(node: cc.Node): number {
        return node.y + (1 - node.anchorY) * node.height;
    }

    static getBottom(node: cc.Node): number {
        return node.y - node.anchorY * node.height;
    }

    static getLeft(node: cc.Node): number {
        return node.x - node.anchorX * node.width;
    }

    static getRight(node: cc.Node): number {
        return node.x + (1 - node.anchorX) * node.width;
    }

    static getContentTop(node: cc.Node): number {
        return (1 - node.anchorY) * node.height;
    }

    static getContentBottom(node: cc.Node): number {
        return -1 * node.anchorY * node.height;
    }

    static getContentLeft(node: cc.Node): number {
        return -1 * node.anchorX * node.width;
    }

    static getContentRight(node: cc.Node): number {
        return (1 - node.anchorX) * node.width;
    }

    /**
     * 判断是否在可视区域外
     * @param node 目标节点
     * @param visiableRect 可视区域
     * @param fixed 修正值。在判断时，会将可视区域扩大 fixed 绝对值
     */
    static isOut(node: cc.Node, visiableRect: IVisiableRect, fixed = 1) {
        if (uk.getBottom(node) > (visiableRect.top + fixed)) {
            return true;
        }
        if (uk.getTop(node) < (visiableRect.bottom - fixed)) {
            return true;
        }
        if (uk.getLeft(node) > (visiableRect.right + fixed)) {
            return true;
        }
        if (uk.getRight(node) < (visiableRect.left - fixed)) {
            return true;
        }
        return false;
    }

    static getVisiable(scollView: cc.ScrollView): IVisiableRect {
        const content = scollView.content;
        const top = uk.getContentTop(content);
        const bottom = uk.getContentBottom(content);
        const left = uk.getContentLeft(content);
        const right = uk.getContentRight(content);

        const offset = scollView.getScrollOffset();
        const visiableTop = Math.min(top - offset.y, top);
        const visiableBottom = Math.max(bottom - offset.y, bottom);
        const visiableLeft = Math.max(left - offset.x, left);
        const visiableRight = Math.min(right - offset.x, right);

        return {
            top: visiableTop,
            bottom: visiableBottom,
            left: visiableLeft,
            right: visiableRight
        };
    }
}