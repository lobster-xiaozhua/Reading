export interface CommentData {
    id: string;
    user: {
        id: string;
        nickname: string;
        avatar: string;
    };
    rating?: number;
    content: string;
    likes: number;
    liked?: boolean;
    createdAt: number;
    replies?: CommentData[];
    deleted?: boolean;
}
export interface CommentProps {
    comment: CommentData;
    /** 是否展开楼中楼回复，默认 true */
    showReplies?: boolean;
    onLike?: (id: string) => void;
    onReply?: (id: string) => void;
    onDelete?: (id: string) => void;
    /** 当前层级，根评论为 0；限制 2 层（即回复嵌套到 depth 2） */
    depth?: number;
    className?: string;
}
export declare function Comment({ comment, showReplies, onLike, onReply, onDelete, depth, className, }: CommentProps): import("react").JSX.Element;
//# sourceMappingURL=Comment.d.ts.map