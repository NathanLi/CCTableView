export interface UIGridViewDelegate {
    /**
     * Cell 的边长大小
     * @param index 
     */
    sizeAtIndex?(index: number): cc.Size;

    /**
     * Cell 大小变动后的回调
     * @param index 
     * @param size 变动后的大小
     */
    onSizeChanged?(index: number, size: cc.Size): void;
}