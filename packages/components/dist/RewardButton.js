import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * RewardButton · P6 §4
 * 打赏按钮：月票(rose-gradient)/推荐(rose 实色)/打赏(rose-gradient)
 * height 40px；hover 提亮+sh-2；active spring 缩放；粒子飞出
 * ============================================================ */
import { useState } from "react";
import { NovelThumbsUp, NovelReward } from "@novel/icons";
const REWARD_CONFIG = {
    ticket: { label: "投月票", variant: "gradient" },
    recommend: { label: "推荐", variant: "solid" },
    tip: { label: "打赏", variant: "gradient" },
};
const REWARD_ICON = {
    ticket: NovelReward,
    recommend: NovelThumbsUp,
    tip: NovelReward,
};
function RewardIconComp({ type }) {
    const IconComp = REWARD_ICON[type];
    return _jsx(IconComp, { size: "sm", "aria-hidden": "true" });
}
export function RewardButton({ rewardType, count = 1, remaining, onReward, disabled = false, loading = false, className, }) {
    const [burst, setBurst] = useState(0);
    const config = REWARD_CONFIG[rewardType];
    const exhausted = disabled || remaining === 0;
    const isDisabled = exhausted || loading;
    const cls = [
        "novel-reward",
        `novel-reward--${rewardType}`,
        `novel-reward--${config.variant}`,
        exhausted ? "is-disabled" : "",
        loading ? "is-loading" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    const handleClick = () => {
        if (isDisabled)
            return;
        setBurst((b) => b + 1);
        onReward?.(rewardType, count);
    };
    const remainingText = remaining != null ? `今日剩余 ${remaining} 张` : null;
    return (_jsxs("div", { className: "novel-reward__wrap", children: [_jsxs("button", { type: "button", className: cls, onClick: handleClick, disabled: isDisabled, "aria-label": `${config.label}${remaining != null ? `，今日剩余 ${remaining} 张` : ""}`, children: [_jsx("span", { className: "novel-reward__icon", "aria-hidden": true, children: loading ? (_jsx("span", { className: "novel-reward__spinner", "aria-hidden": true })) : (_jsx(RewardIconComp, { type: rewardType })) }), _jsx("span", { className: "novel-reward__label", children: exhausted ? "今日已用完" : config.label }), burst > 0 ? (_jsx("span", { className: "novel-reward__particles", "aria-hidden": true, children: Array.from({ length: 6 }).map((_, i) => (_jsx("span", { className: "novel-reward__particle", style: { "--i": String(i) } }, i))) }, burst)) : null] }), remainingText ? (_jsx("div", { className: "novel-reward__remaining", children: remainingText })) : null] }));
}
//# sourceMappingURL=RewardButton.js.map