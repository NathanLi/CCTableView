import UIGridCell from "./cell/UIGridCell";

export interface UIGridViewDataSource {
    /**
     * 根据索引获取 cell
     * @param index 
     */
    cellAtIndex(index: number): UIGridCell;
}