import { type ReactNode } from "react";
export type TabsType = "line" | "card";
export type TabsSize = "sm" | "md" | "lg";
export interface TabItem {
    key: string;
    label: ReactNode;
    children?: ReactNode;
    disabled?: boolean;
}
export interface TabsProps {
    activeKey: string;
    items: TabItem[];
    type?: TabsType;
    size?: TabsSize;
    onChange?: (key: string) => void;
}
export declare function Tabs({ activeKey, items, type, size, onChange, }: TabsProps): import("react").JSX.Element;
//# sourceMappingURL=Tabs.d.ts.map