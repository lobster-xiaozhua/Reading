import { type ReaderSettings as ReaderSettingsValue } from "./useReaderSettings.js";
export interface ReaderSettingsProps {
    settings: ReaderSettingsValue;
    onChange: (next: ReaderSettingsValue) => void;
    visible: boolean;
    onClose: () => void;
    className?: string;
}
export declare function ReaderSettings({ settings, onChange, visible, onClose, className, }: ReaderSettingsProps): import("react").JSX.Element;
//# sourceMappingURL=ReaderSettings.d.ts.map