interface IVisiableRect {
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

    static getVisiable(scollView: cc.ScrollView): IVisiableRect {
        const content = scollView.content;
        const top = this.getContentTop(content);
        const bottom = this.getContentBottom(content);
        const left = this.getContentLeft(content);
        const right = this.getContentRight(content);

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