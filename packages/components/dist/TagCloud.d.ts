export interface TagCloudTag {
    id: string;
    name: string;
    count: number;
}
export interface TagCloudProps {
    tags: TagCloudTag[];
    /** 排序：count 降序 / name 升序，默认 count */
    sortBy?: "count" | "name";
    /** 截断数量，默认 30 */
    maxCount?: number;
    /** 展示形态，默认 cloud */
    variant?: "cloud" | "list";
    /** 选中的标签 id 列表 */
    selected?: string[];
    onSelect?: (tag: TagCloudTag) => void;
    className?: string;
}
export declare function TagCloud({ tags, sortBy, maxCount, variant, selected, onSelect, className, }: TagCloudProps): import("react").JSX.Element;
//# sourceMappingURL=TagCloud.d.ts.map